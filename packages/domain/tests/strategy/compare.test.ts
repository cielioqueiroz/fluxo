import { describe, expect, it } from 'vitest'

import { price } from '../../src/amortization/price.js'
import { ZERO, cents } from '../../src/money/decimal.js'
import { rate } from '../../src/money/rate.js'
import { compare, portabilityBreakEven } from '../../src/strategy/compare.js'
import { prepayWithMonthlyExtra } from '../../src/strategy/prepayment.js'

const emprestimo = { principal: cents(1000000), monthlyRate: rate(0.02), termMonths: 24 } as const

describe('portabilityBreakEven', () => {
  it('com aporte zero, a taxa de equilibrio e a propria taxa atual', () => {
    expect(portabilityBreakEven(emprestimo, ZERO)).toBeCloseTo(0.02, 6)
  })

  it('fica entre zero e a taxa atual', () => {
    const r = portabilityBreakEven(emprestimo, cents(20000))
    expect(r).toBeGreaterThanOrEqual(0)
    expect(r).toBeLessThanOrEqual(0.02)
  })

  it('portar na taxa de equilibrio paga praticamente o mesmo que antecipar', () => {
    const extra = cents(20000)
    const equilibrio = portabilityBreakEven(emprestimo, extra)
    const portado = price({ ...emprestimo, monthlyRate: equilibrio })
    const antecipado = prepayWithMonthlyExtra(emprestimo, extra)
    // um centavo por parcela e o maximo que o arredondamento pode separar
    expect(Math.abs(portado.totalPaid - antecipado.totalPaid)).toBeLessThanOrEqual(
      emprestimo.termMonths,
    )
  })

  it('aporte maior empurra a taxa de equilibrio para baixo', () => {
    const pequeno = portabilityBreakEven(emprestimo, cents(10000))
    const grande = portabilityBreakEven(emprestimo, cents(50000))
    expect(grande).toBeLessThan(pequeno)
  })

  it('aporte que quita tudo de uma vez ainda tem equilibrio, bem abaixo da taxa atual', () => {
    const extra = cents(9999999)
    const equilibrio = portabilityBreakEven(emprestimo, extra)
    expect(equilibrio).toBeLessThan(emprestimo.monthlyRate / 10)
    const portado = price({ ...emprestimo, monthlyRate: equilibrio })
    const antecipado = prepayWithMonthlyExtra(emprestimo, extra)
    expect(Math.abs(portado.totalPaid - antecipado.totalPaid)).toBeLessThanOrEqual(
      emprestimo.termMonths,
    )
  })
})

describe('compare', () => {
  it('manter nao economiza contra si mesmo', () => {
    const c = compare(emprestimo, cents(20000), null)
    expect(c.keep.savedVersusKeep).toBe(0)
    expect(c.keep.savedVersusKeepMonths).toBe(0)
  })

  it('antecipar economiza em dinheiro e em meses', () => {
    const c = compare(emprestimo, cents(20000), null)
    expect(c.prepay.savedVersusKeep).toBeGreaterThan(0)
    expect(c.prepay.savedVersusKeepMonths).toBeGreaterThan(0)
  })

  it('sem taxa de destino, portabilidade traz so o limiar', () => {
    const c = compare(emprestimo, cents(20000), null)
    expect(c.portability.atTargetRate).toBeNull()
    expect(c.portability.breakEvenMonthlyRate).toBeGreaterThan(0)
  })

  it('com taxa de destino melhor que o limiar, portar ganha de antecipar', () => {
    const extra = cents(20000)
    const limiar = portabilityBreakEven(emprestimo, extra)
    const melhor = rate(limiar * 0.5)
    const c = compare(emprestimo, extra, melhor)
    expect(c.portability.atTargetRate).not.toBeNull()
    expect(c.portability.atTargetRate?.savedVersusKeep).toBeGreaterThan(c.prepay.savedVersusKeep)
  })

  it('portar mantendo a taxa atual nao economiza nada', () => {
    const c = compare(emprestimo, cents(20000), emprestimo.monthlyRate)
    expect(c.portability.atTargetRate?.savedVersusKeep).toBe(0)
    expect(c.portability.atTargetRate?.termMonths).toBe(24)
  })

  it('o total pago de manter bate com a tabela Price direta', () => {
    const c = compare(emprestimo, cents(20000), null)
    expect(c.keep.totalPaid).toBe(price(emprestimo).totalPaid)
  })
})
