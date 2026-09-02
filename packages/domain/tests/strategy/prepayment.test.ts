import { describe, expect, it } from 'vitest'

import { price } from '../../src/amortization/price.js'
import { ZERO, cents } from '../../src/money/decimal.js'
import { rate } from '../../src/money/rate.js'
import { prepayWithMonthlyExtra } from '../../src/strategy/prepayment.js'

const emprestimo = { principal: cents(1000000), monthlyRate: rate(0.01), termMonths: 12 } as const

describe('prepayWithMonthlyExtra', () => {
  it('aporte zero devolve a mesma coisa que a tabela original', () => {
    const original = price(emprestimo)
    const com = prepayWithMonthlyExtra(emprestimo, ZERO)
    expect(com.termMonths).toBe(original.termMonths)
    expect(com.totalPaid).toBe(original.totalPaid)
  })

  it('encurta o prazo e reduz o total pago', () => {
    const original = price(emprestimo)
    const com = prepayWithMonthlyExtra(emprestimo, cents(20000))
    expect(com.termMonths).toBeLessThan(original.termMonths)
    expect(com.totalPaid).toBeLessThan(original.totalPaid)
    expect(com.settled).toBe(true)
  })

  it('aporte maior que o saldo devedor quita no primeiro mes', () => {
    const com = prepayWithMonthlyExtra(emprestimo, cents(5000000))
    expect(com.termMonths).toBe(1)
    expect(com.settled).toBe(true)
  })

  it('nunca gera periodo fantasma com saldo zero', () => {
    for (const extra of [1000, 5000, 12345, 99999]) {
      const com = prepayWithMonthlyExtra(emprestimo, cents(extra))
      expect(com.installments.every((linha) => linha.payment > 0)).toBe(true)
      expect(com.finalBalance).toBe(0)
    }
  })

  it('nunca paga menos que o principal', () => {
    const com = prepayWithMonthlyExtra(emprestimo, cents(30000))
    expect(com.totalPaid).toBeGreaterThanOrEqual(com.principal)
  })

  it('funciona com taxa zero', () => {
    const com = prepayWithMonthlyExtra(
      { principal: cents(1200000), monthlyRate: rate(0), termMonths: 12 },
      cents(100000),
    )
    expect(com.totalPaid).toBe(1200000)
    expect(com.termMonths).toBe(6)
  })

  it('marca toda linha como emprestimo', () => {
    const com = prepayWithMonthlyExtra(emprestimo, cents(20000))
    expect(com.installments.every((linha) => linha.stage === 'loan')).toBe(true)
  })

  it('recusa prazo zero', () => {
    expect(() =>
      prepayWithMonthlyExtra(
        { principal: cents(1000), monthlyRate: rate(0.01), termMonths: 0 },
        ZERO,
      ),
    ).toThrow(RangeError)
  })
})
