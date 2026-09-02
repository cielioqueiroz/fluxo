import { describe, expect, it } from 'vitest'

import { buildSchedule, type Installment } from '../../src/amortization/schedule.js'
import { ZERO, cents } from '../../src/money/decimal.js'

const linha = (over: Partial<Installment> = {}): Installment => ({
  period: 1,
  stage: 'loan',
  openingBalance: cents(1000),
  interest: ZERO,
  fees: ZERO,
  amortization: cents(1000),
  payment: cents(1000),
  closingBalance: ZERO,
  ...over,
})

const quitada = { requireSettled: true, neverSettles: false } as const

describe('buildSchedule', () => {
  it('soma os agregados a partir das linhas', () => {
    const s = buildSchedule(
      [
        linha({
          period: 1,
          interest: cents(10),
          amortization: cents(500),
          payment: cents(510),
          closingBalance: cents(500),
        }),
        linha({
          period: 2,
          openingBalance: cents(500),
          interest: cents(5),
          amortization: cents(500),
          payment: cents(505),
        }),
      ],
      cents(1000),
      quitada,
    )
    expect(s.totalPaid).toBe(1015)
    expect(s.totalInterest).toBe(15)
    expect(s.totalFees).toBe(0)
    expect(s.termMonths).toBe(2)
    expect(s.settled).toBe(true)
    expect(s.finalBalance).toBe(0)
  })

  it('recusa linha em que o saldo final nao fecha com a conta', () => {
    expect(() =>
      buildSchedule([linha({ closingBalance: cents(1) })], cents(1000), quitada),
    ).toThrow(/saldo final da linha/i)
  })

  it('recusa linha em que a amortizacao nao fecha com o pagamento', () => {
    expect(() =>
      buildSchedule([linha({ amortization: cents(999) })], cents(1000), quitada),
    ).toThrow(/amortizacao da linha/i)
  })

  it('recusa tabela cuja soma de amortizacoes nao devolve o principal', () => {
    expect(() => buildSchedule([linha()], cents(2000), quitada)).toThrow(/principal/i)
  })

  it('recusa tabela vazia', () => {
    expect(() => buildSchedule([], cents(1000), quitada)).toThrow(/vazia/i)
  })

  it('recusa nao quitada quando o chamador exige quitacao', () => {
    const naoQuita = linha({
      amortization: cents(400),
      payment: cents(400),
      closingBalance: cents(600),
    })
    expect(() => buildSchedule([naoQuita], cents(1000), quitada)).toThrow(/quitar/i)
  })

  it('aceita nao quitada quando o chamador nao exige', () => {
    const naoQuita = linha({
      stage: 'revolving',
      amortization: cents(400),
      payment: cents(400),
      closingBalance: cents(600),
    })
    const s = buildSchedule([naoQuita], cents(1000), { requireSettled: false, neverSettles: true })
    expect(s.settled).toBe(false)
    expect(s.neverSettles).toBe(true)
    expect(s.finalBalance).toBe(600)
  })

  it('recusa settled e neverSettles ao mesmo tempo', () => {
    expect(() =>
      buildSchedule([linha()], cents(1000), { requireSettled: false, neverSettles: true }),
    ).toThrow(/ao mesmo tempo/i)
  })

  it('aceita amortizacao negativa, que e a divida crescendo', () => {
    const cresce = linha({
      stage: 'revolving',
      interest: cents(150),
      amortization: cents(-50),
      payment: cents(100),
      closingBalance: cents(1050),
    })
    const s = buildSchedule([cresce], cents(1000), { requireSettled: false, neverSettles: true })
    expect(s.installments[0]?.amortization).toBe(-50)
    expect(s.finalBalance).toBe(1050)
  })

  it('soma os encargos separados dos juros', () => {
    const comIof = linha({
      stage: 'revolving',
      interest: cents(100),
      fees: cents(20),
      amortization: cents(880),
      payment: cents(1000),
      closingBalance: cents(120),
    })
    const s = buildSchedule([comIof], cents(1000), { requireSettled: false, neverSettles: false })
    expect(s.totalInterest).toBe(100)
    expect(s.totalFees).toBe(20)
  })
})
