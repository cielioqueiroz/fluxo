import { describe, expect, it } from 'vitest'

import { resolvePayment } from '../../src/credit-card/minimum-payment.js'
import { ZERO, cents } from '../../src/money/decimal.js'
import { rate } from '../../src/money/rate.js'

const quinzePorCento = rate(0.15)

describe('resolvePayment', () => {
  it('paga a fatura inteira na politica full', () => {
    expect(resolvePayment(cents(100000), { kind: 'full' }, quinzePorCento)).toBe(100000)
  })

  it('paga a fracao minima', () => {
    expect(resolvePayment(cents(100000), { kind: 'minimum' }, quinzePorCento)).toBe(15000)
  })

  it('nunca paga mais que a fatura na politica fixa', () => {
    expect(
      resolvePayment(cents(1000), { kind: 'fixed', amount: cents(50000) }, quinzePorCento),
    ).toBe(1000)
  })

  it('paga o valor fixo quando ele cabe na fatura', () => {
    expect(
      resolvePayment(cents(100000), { kind: 'fixed', amount: cents(30000) }, quinzePorCento),
    ).toBe(30000)
  })

  it('fatura de um centavo quita, em vez de gerar tabela infinita', () => {
    expect(resolvePayment(cents(1), { kind: 'minimum' }, quinzePorCento)).toBe(1)
  })

  it('fatura zerada nao gera pagamento', () => {
    expect(resolvePayment(ZERO, { kind: 'minimum' }, quinzePorCento)).toBe(0)
  })

  it('fracao minima zero faz o minimo virar a fatura inteira', () => {
    expect(resolvePayment(cents(100000), { kind: 'minimum' }, rate(0))).toBe(100000)
  })
})
