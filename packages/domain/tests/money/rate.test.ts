import { describe, expect, it } from 'vitest'

import { cents } from '../../src/money/decimal.js'
import { applyRate, fromAnnual, fromPercent, rate, toAnnual } from '../../src/money/rate.js'

describe('rate', () => {
  it('aceita zero, que e taxa valida e nao caso degenerado', () => {
    expect(rate(0)).toBe(0)
  })

  it('recusa negativo', () => {
    expect(() => rate(-0.01)).toThrow(RangeError)
  })

  it('recusa nao finito', () => {
    expect(() => rate(Number.NaN)).toThrow(RangeError)
  })

  it('converte percentual em fracao', () => {
    expect(fromPercent(1.5)).toBeCloseTo(0.015, 10)
  })
})

describe('conversao mensal e anual', () => {
  it('capitaliza doze meses', () => {
    expect(toAnnual(rate(0.01))).toBeCloseTo(0.12682503, 8)
  })

  it('volta ao mensal', () => {
    expect(fromAnnual(rate(0.12682503))).toBeCloseTo(0.01, 8)
  })

  it('ida e volta preserva a taxa', () => {
    expect(fromAnnual(toAnnual(rate(0.0234)))).toBeCloseTo(0.0234, 10)
  })

  it('taxa zero continua zero nos dois sentidos', () => {
    expect(toAnnual(rate(0))).toBe(0)
    expect(fromAnnual(rate(0))).toBe(0)
  })
})

describe('applyRate', () => {
  it('arredonda o resultado para centavo', () => {
    expect(applyRate(cents(10000), rate(0.015))).toBe(150)
  })

  it('arredonda meio para cima', () => {
    expect(applyRate(cents(101), rate(0.005))).toBe(1)
  })

  it('taxa zero nao gera juros', () => {
    expect(applyRate(cents(999999), rate(0))).toBe(0)
  })
})
