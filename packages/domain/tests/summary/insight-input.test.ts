import { describe, expect, it } from 'vitest'

import { price } from '../../src/amortization/price.js'
import { cardDebt } from '../../src/credit-card/card-debt.js'
import { cents } from '../../src/money/decimal.js'
import { rate } from '../../src/money/rate.js'
import { summarizeForInsight } from '../../src/summary/insight-input.js'

const emprestimo = price({ principal: cents(1000000), monthlyRate: rate(0.02), termMonths: 24 })

describe('summarizeForInsight', () => {
  it('traz os tres marcos em ordem crescente de periodo', () => {
    const r = summarizeForInsight(emprestimo, 'loan', null)
    expect(r.milestones.map((m) => m.fraction)).toEqual([0.25, 0.5, 0.75])
    const periodos = r.milestones.map((m) => m.period)
    expect(periodos[0]).toBeLessThan(periodos[1] ?? 0)
    expect(periodos[1]).toBeLessThan(periodos[2] ?? 0)
  })

  it('o saldo de cada marco e o saldo final daquele periodo', () => {
    const r = summarizeForInsight(emprestimo, 'loan', null)
    for (const marco of r.milestones) {
      const linha = emprestimo.installments.find((l) => l.period === marco.period)
      expect(marco.balance).toBe(linha?.closingBalance)
    }
  })

  it('calcula o percentual de juros sobre o principal com uma casa', () => {
    const r = summarizeForInsight(emprestimo, 'loan', null)
    expect(r.interestOverPrincipalPercent).toBeCloseTo(
      Math.round((emprestimo.totalInterest / emprestimo.principal) * 1000) / 10,
      10,
    )
  })

  it('nunca carrega o array de parcelas', () => {
    const r = summarizeForInsight(emprestimo, 'loan', null)
    expect(Object.keys(r)).not.toContain('installments')
    expect(JSON.stringify(r).length).toBeLessThan(1200)
  })

  it('cenario que nunca quita devolve marcos vazios', () => {
    const r = cardDebt({
      invoice: cents(100000),
      revolvingRate: rate(0.2),
      installmentRate: rate(0.08),
      installmentTermMonths: 0,
      policy: { kind: 'minimum' },
      params: {
        revolvingCycleLimit: 24,
        minimumFraction: rate(0.15),
        iof: null,
        totalChargeCap: null,
      },
    })
    const resumo = summarizeForInsight(r.schedule, 'card', r.capReachedAtPeriod)
    expect(resumo.milestones).toEqual([])
    expect(resumo.neverSettles).toBe(true)
    expect(resumo.settled).toBe(false)
  })

  it('carrega o periodo em que o teto mordeu', () => {
    const resumo = summarizeForInsight(emprestimo, 'loan', 7)
    expect(resumo.capReachedAtPeriod).toBe(7)
  })

  it('resume um cartao com os dois estagios, contando IOF separado dos juros', () => {
    const r = cardDebt({
      invoice: cents(100000),
      revolvingRate: rate(0.15),
      installmentRate: rate(0.08),
      installmentTermMonths: 12,
      policy: { kind: 'minimum' },
      params: {
        revolvingCycleLimit: 1,
        minimumFraction: rate(0.15),
        iof: { fixed: rate(0.0038), daily: rate(0.000082), dailyCapDays: 365 },
        totalChargeCap: rate(1),
      },
    })
    const resumo = summarizeForInsight(r.schedule, 'card', r.capReachedAtPeriod)
    expect(resumo.kind).toBe('card')
    expect(resumo.totalFees).toBeGreaterThan(0)
    expect(resumo.settled).toBe(true)
    expect(resumo.milestones).toHaveLength(3)
  })

  it('principal zero nao divide por zero', () => {
    const zerado = price({ principal: cents(0), monthlyRate: rate(0.02), termMonths: 3 })
    const resumo = summarizeForInsight(zerado, 'loan', null)
    expect(resumo.interestOverPrincipalPercent).toBe(0)
  })
})
