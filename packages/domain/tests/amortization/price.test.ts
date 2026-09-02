import { describe, expect, it } from 'vitest'

import { price, pricePayment } from '../../src/amortization/price.js'
import { cents } from '../../src/money/decimal.js'
import { rate } from '../../src/money/rate.js'

describe('pricePayment', () => {
  it('calcula a parcela fixa da tabela Price', () => {
    // 10000,00 em 12 meses a 1% ao mes
    expect(pricePayment(cents(1000000), rate(0.01), 12)).toBe(88849)
  })

  it('com taxa zero, e o principal dividido pelo prazo', () => {
    expect(pricePayment(cents(1000000), rate(0), 12)).toBe(83333)
  })
})

describe('price', () => {
  it('quita exatamente, sem sobra nem falta', () => {
    const s = price({ principal: cents(1000000), monthlyRate: rate(0.01), termMonths: 12 })
    expect(s.settled).toBe(true)
    expect(s.finalBalance).toBe(0)
    expect(s.installments).toHaveLength(12)
  })

  it('total pago e a soma das parcelas, e juros e a diferenca para o principal', () => {
    const s = price({ principal: cents(1000000), monthlyRate: rate(0.01), termMonths: 12 })
    const soma = s.installments.reduce<number>((acc, i) => acc + i.payment, 0)
    expect(s.totalPaid).toBe(soma)
    expect(s.totalInterest).toBe(s.totalPaid - s.principal)
  })

  it('mantem a parcela constante, exceto a ultima que absorve o residuo', () => {
    const s = price({ principal: cents(1000000), monthlyRate: rate(0.01), termMonths: 12 })
    const menosAUltima = s.installments.slice(0, -1).map((i) => i.payment)
    expect(new Set(menosAUltima).size).toBe(1)
  })

  it('taxa zero nao cobra juros e ainda quita', () => {
    const s = price({ principal: cents(1000000), monthlyRate: rate(0), termMonths: 12 })
    expect(s.totalInterest).toBe(0)
    expect(s.totalPaid).toBe(1000000)
    expect(s.settled).toBe(true)
  })

  it('prazo de um mes paga principal mais um mes de juros', () => {
    const s = price({ principal: cents(100000), monthlyRate: rate(0.02), termMonths: 1 })
    expect(s.installments).toHaveLength(1)
    expect(s.totalInterest).toBe(2000)
    expect(s.totalPaid).toBe(102000)
    expect(s.settled).toBe(true)
  })

  it('valor que nao divide pelo prazo ainda fecha em zero', () => {
    const s = price({ principal: cents(100001), monthlyRate: rate(0), termMonths: 3 })
    expect(s.finalBalance).toBe(0)
    expect(s.totalPaid).toBe(100001)
  })

  it('marca toda linha como emprestimo', () => {
    const s = price({ principal: cents(500000), monthlyRate: rate(0.015), termMonths: 6 })
    expect(s.installments.every((i) => i.stage === 'loan')).toBe(true)
  })

  it('recusa prazo zero', () => {
    expect(() => price({ principal: cents(1000), monthlyRate: rate(0.01), termMonths: 0 })).toThrow(
      RangeError,
    )
  })
})
