import { describe, expect, it } from 'vitest'

import { cardDebt } from '../../src/credit-card/card-debt.js'
import { type CardInput, type CardParams } from '../../src/credit-card/params.js'
import { cents } from '../../src/money/decimal.js'
import { rate } from '../../src/money/rate.js'

const brasilLike: CardParams = {
  revolvingCycleLimit: 1,
  minimumFraction: rate(0.15),
  iof: null,
  totalChargeCap: rate(1),
}

const entrada = (over: Partial<CardInput> = {}): CardInput => ({
  invoice: cents(100000),
  revolvingRate: rate(0.15),
  installmentRate: rate(0.08),
  installmentTermMonths: 12,
  policy: { kind: 'minimum' },
  params: brasilLike,
  ...over,
})

describe('cardDebt', () => {
  it('tem um ciclo de rotativo e depois parcelamento', () => {
    const r = cardDebt(entrada())
    expect(r.schedule.installments[0]?.stage).toBe('revolving')
    expect(r.schedule.installments[1]?.stage).toBe('installment')
    expect(r.revolvingEndedAtPeriod).toBe(1)
    expect(r.schedule.installments).toHaveLength(13)
  })

  it('o saldo atravessa a fronteira dos estagios sem buraco', () => {
    const r = cardDebt(entrada())
    const rotativo = r.schedule.installments[0]
    const primeiroParcelado = r.schedule.installments[1]
    expect(primeiroParcelado?.openingBalance).toBe(rotativo?.closingBalance)
  })

  it('quita ao fim do parcelamento', () => {
    const r = cardDebt(entrada())
    expect(r.schedule.settled).toBe(true)
    expect(r.schedule.finalBalance).toBe(0)
    expect(r.schedule.neverSettles).toBe(false)
  })

  it('nao cria estagio de parcelamento quando o rotativo ja quitou', () => {
    const r = cardDebt(entrada({ policy: { kind: 'full' } }))
    expect(r.schedule.installments).toHaveLength(1)
    expect(r.revolvingEndedAtPeriod).toBe(1)
    expect(r.schedule.settled).toBe(true)
  })

  it('o teto conta os dois estagios somados', () => {
    const r = cardDebt(
      entrada({ revolvingRate: rate(0.5), installmentRate: rate(0.5), installmentTermMonths: 24 }),
    )
    const encargos = r.schedule.totalInterest + r.schedule.totalFees
    expect(encargos).toBeLessThanOrEqual(r.schedule.principal)
    expect(r.capReachedAtPeriod).not.toBeNull()
  })

  it('o principal da tabela e a fatura original', () => {
    const r = cardDebt(entrada())
    expect(r.schedule.principal).toBe(100000)
  })

  it('sem parcelamento e com o rotativo se estendendo, a divida nunca quita', () => {
    const generico: CardParams = {
      revolvingCycleLimit: 24,
      minimumFraction: rate(0.15),
      iof: null,
      totalChargeCap: null,
    }
    const r = cardDebt(
      entrada({ params: generico, revolvingRate: rate(0.2), installmentTermMonths: 0 }),
    )
    expect(r.schedule.neverSettles).toBe(true)
    expect(r.schedule.settled).toBe(false)
    expect(r.revolvingEndedAtPeriod).toBeNull()
  })

  it('um ciclo com minimo insuficiente ainda vai para o parcelamento e quita', () => {
    // Este e o teste que impede o defeito obvio: com o limite brasileiro de um
    // ciclo, saldo crescendo no rotativo nao e divida eterna, e sim um saldo
    // maior entrando no parcelamento obrigatorio.
    const r = cardDebt(entrada({ revolvingRate: rate(0.2) }))
    expect(r.schedule.neverSettles).toBe(false)
    expect(r.schedule.settled).toBe(true)
    expect(r.schedule.installments[0]?.amortization).toBeLessThan(0)
    expect(r.schedule.installments[1]?.stage).toBe('installment')
    expect(r.schedule.installments[1]?.openingBalance).toBeGreaterThan(100000)
  })

  it('cobra IOF no rotativo e nao no parcelamento', () => {
    const comIof: CardParams = {
      ...brasilLike,
      iof: { fixed: rate(0.0038), daily: rate(0.000082), dailyCapDays: 365 },
    }
    const r = cardDebt(entrada({ params: comIof }))
    expect(r.schedule.installments[0]?.fees).toBeGreaterThan(0)
    expect(r.schedule.installments.slice(1).every((l) => l.fees === 0)).toBe(true)
  })

  it('numera os periodos em sequencia continua entre os dois estagios', () => {
    const r = cardDebt(entrada())
    expect(r.schedule.installments.map((l) => l.period)).toEqual([
      1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13,
    ])
  })
})
