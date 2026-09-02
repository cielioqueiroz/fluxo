import { describe, expect, it } from 'vitest'

import { type CardParams } from '../../src/credit-card/params.js'
import { revolvingStage } from '../../src/credit-card/revolving.js'
import { cents } from '../../src/money/decimal.js'
import { rate } from '../../src/money/rate.js'

const semIof: CardParams = {
  revolvingCycleLimit: 1,
  minimumFraction: rate(0.15),
  iof: null,
  totalChargeCap: null,
}

describe('revolvingStage', () => {
  it('cobra juros e aplica o pagamento minimo em um ciclo', () => {
    // fatura 100000, juros 15% = 15000, fatura do mes 115000,
    // minimo 15% de 115000 = 17250, saldo 97750
    const r = revolvingStage({
      invoice: cents(100000),
      monthlyRate: rate(0.15),
      policy: { kind: 'minimum' },
      params: semIof,
      startPeriod: 1,
      chargeAllowance: null,
    })
    expect(r.rows).toHaveLength(1)
    expect(r.rows[0]?.interest).toBe(15000)
    expect(r.rows[0]?.payment).toBe(17250)
    expect(r.balance).toBe(97750)
    expect(r.chargesUsed).toBe(15000)
  })

  it('marca a linha como rotativo', () => {
    const r = revolvingStage({
      invoice: cents(100000),
      monthlyRate: rate(0.1),
      policy: { kind: 'minimum' },
      params: semIof,
      startPeriod: 1,
      chargeAllowance: null,
    })
    expect(r.rows[0]?.stage).toBe('revolving')
  })

  it('quita no proprio ciclo quando a politica e pagar tudo', () => {
    const r = revolvingStage({
      invoice: cents(100000),
      monthlyRate: rate(0.15),
      policy: { kind: 'full' },
      params: semIof,
      startPeriod: 1,
      chargeAllowance: null,
    })
    expect(r.balance).toBe(0)
    expect(r.grewEveryCycle).toBe(false)
  })

  it('cobra IOF fixo mais diario de trinta dias', () => {
    // 0,38% mais 0,0082% vezes 30 dias = 0,626% de 100000 = 626
    const comIof: CardParams = {
      ...semIof,
      iof: { fixed: rate(0.0038), daily: rate(0.000082), dailyCapDays: 365 },
    }
    const r = revolvingStage({
      invoice: cents(100000),
      monthlyRate: rate(0),
      policy: { kind: 'fixed', amount: cents(0) },
      params: comIof,
      startPeriod: 1,
      chargeAllowance: null,
    })
    expect(r.rows[0]?.fees).toBe(626)
    expect(r.iofDaysUsed).toBe(30)
  })

  it('para de acumular dia de IOF depois do limite de dias', () => {
    const comIof: CardParams = {
      ...semIof,
      revolvingCycleLimit: 24,
      iof: { fixed: rate(0), daily: rate(0.000082), dailyCapDays: 60 },
    }
    const r = revolvingStage({
      invoice: cents(100000),
      monthlyRate: rate(0),
      policy: { kind: 'fixed', amount: cents(0) },
      params: comIof,
      startPeriod: 1,
      chargeAllowance: null,
    })
    expect(r.iofDaysUsed).toBe(60)
    expect(r.rows[2]?.fees).toBe(0)
  })

  it('corta o encargo no teto restante, sem zera-lo', () => {
    const r = revolvingStage({
      invoice: cents(100000),
      monthlyRate: rate(0.15),
      policy: { kind: 'fixed', amount: cents(0) },
      params: semIof,
      startPeriod: 1,
      chargeAllowance: cents(4000),
    })
    expect(r.rows[0]?.interest).toBe(4000)
    expect(r.capReachedAtPeriod).toBe(1)
    expect(r.chargesUsed).toBe(4000)
  })

  it('com limite de ciclos maior que um, relata que o saldo so cresceu', () => {
    // juros de 20% ao mes contra minimo de 15%: a divida so cresce
    const generico: CardParams = { ...semIof, revolvingCycleLimit: 24 }
    const r = revolvingStage({
      invoice: cents(100000),
      monthlyRate: rate(0.2),
      policy: { kind: 'minimum' },
      params: generico,
      startPeriod: 1,
      chargeAllowance: null,
    })
    expect(r.rows).toHaveLength(24)
    expect(r.grewEveryCycle).toBe(true)
    expect(r.balance).toBeGreaterThan(100000)
    expect(r.rows.every((linha) => linha.amortization < 0)).toBe(true)
  })

  it('um unico ciclo com minimo insuficiente amortiza negativo, sem julgar a divida', () => {
    const r = revolvingStage({
      invoice: cents(100000),
      monthlyRate: rate(0.2),
      policy: { kind: 'minimum' },
      params: semIof,
      startPeriod: 1,
      chargeAllowance: null,
    })
    expect(r.rows).toHaveLength(1)
    expect(r.grewEveryCycle).toBe(true)
    expect(r.balance).toBeGreaterThan(100000)
  })

  it('numera os periodos a partir de startPeriod', () => {
    const generico: CardParams = { ...semIof, revolvingCycleLimit: 3 }
    const r = revolvingStage({
      invoice: cents(100000),
      monthlyRate: rate(0.05),
      policy: { kind: 'minimum' },
      params: generico,
      startPeriod: 7,
      chargeAllowance: null,
    })
    expect(r.rows.map((linha) => linha.period)).toEqual([7, 8, 9])
  })

  it('para de rodar quando a divida quita antes do limite de ciclos', () => {
    const generico: CardParams = { ...semIof, revolvingCycleLimit: 12 }
    const r = revolvingStage({
      invoice: cents(100000),
      monthlyRate: rate(0),
      policy: { kind: 'fixed', amount: cents(60000) },
      params: generico,
      startPeriod: 1,
      chargeAllowance: null,
    })
    expect(r.rows).toHaveLength(2)
    expect(r.balance).toBe(0)
  })

  it('nao produz linha nenhuma quando o limite de ciclos e zero', () => {
    const semRotativo: CardParams = { ...semIof, revolvingCycleLimit: 0 }
    const r = revolvingStage({
      invoice: cents(100000),
      monthlyRate: rate(0.15),
      policy: { kind: 'minimum' },
      params: semRotativo,
      startPeriod: 1,
      chargeAllowance: null,
    })
    expect(r.rows).toHaveLength(0)
    expect(r.balance).toBe(100000)
    expect(r.grewEveryCycle).toBe(false)
  })
})
