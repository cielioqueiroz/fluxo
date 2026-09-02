import { describe, expect, it } from 'vitest'

import { price } from '../../src/amortization/price.js'
import { sac } from '../../src/amortization/sac.js'
import { cents } from '../../src/money/decimal.js'
import { rate } from '../../src/money/rate.js'

describe('sac', () => {
  it('quita exatamente', () => {
    const s = sac({ principal: cents(1200000), monthlyRate: rate(0.01), termMonths: 12 })
    expect(s.settled).toBe(true)
    expect(s.finalBalance).toBe(0)
  })

  it('mantem a amortizacao constante, exceto a ultima com o residuo', () => {
    const s = sac({ principal: cents(1000000), monthlyRate: rate(0.01), termMonths: 3 })
    expect(s.installments.map((i) => i.amortization)).toEqual([333333, 333333, 333334])
  })

  it('tem parcela decrescente', () => {
    const s = sac({ principal: cents(1200000), monthlyRate: rate(0.01), termMonths: 12 })
    const pagamentos = s.installments.map((i) => i.payment)
    for (let i = 1; i < pagamentos.length; i += 1) {
      expect(pagamentos[i]).toBeLessThan(pagamentos[i - 1] ?? 0)
    }
  })

  it('paga menos juros que a Price no mesmo cenario', () => {
    const entrada = { principal: cents(1200000), monthlyRate: rate(0.01), termMonths: 12 } as const
    expect(sac(entrada).totalInterest).toBeLessThan(price(entrada).totalInterest)
  })

  it('taxa zero e parcela constante igual a amortizacao', () => {
    const s = sac({ principal: cents(900000), monthlyRate: rate(0), termMonths: 3 })
    expect(s.installments.map((i) => i.payment)).toEqual([300000, 300000, 300000])
    expect(s.totalInterest).toBe(0)
  })

  it('prazo de um mes', () => {
    const s = sac({ principal: cents(100000), monthlyRate: rate(0.02), termMonths: 1 })
    expect(s.installments).toHaveLength(1)
    expect(s.totalPaid).toBe(102000)
  })

  it('valor que nao divide pelo prazo ainda fecha em zero', () => {
    const s = sac({ principal: cents(100001), monthlyRate: rate(0.01), termMonths: 7 })
    expect(s.finalBalance).toBe(0)
    expect(s.settled).toBe(true)
  })

  it('marca toda linha como emprestimo', () => {
    const s = sac({ principal: cents(500000), monthlyRate: rate(0.015), termMonths: 6 })
    expect(s.installments.every((i) => i.stage === 'loan')).toBe(true)
  })

  it('recusa prazo zero', () => {
    expect(() => sac({ principal: cents(1000), monthlyRate: rate(0.01), termMonths: 0 })).toThrow(
      RangeError,
    )
  })
})
