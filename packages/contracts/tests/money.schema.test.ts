import { price } from '@fluxo/domain'
import { describe, expect, it } from 'vitest'

import { centsSchema, rateSchema } from '../src/money.schema.js'

describe('centsSchema', () => {
  it('aceita inteiro nao negativo', () => {
    expect(centsSchema.parse(1234)).toBe(1234)
  })

  it('aceita zero', () => {
    expect(centsSchema.parse(0)).toBe(0)
  })

  it('recusa fracao', () => {
    expect(centsSchema.safeParse(12.5).success).toBe(false)
  })

  it('recusa negativo', () => {
    expect(centsSchema.safeParse(-1).success).toBe(false)
  })

  it('recusa alem do inteiro seguro', () => {
    expect(centsSchema.safeParse(Number.MAX_SAFE_INTEGER + 2).success).toBe(false)
  })

  it('recusa NaN e infinito', () => {
    expect(centsSchema.safeParse(Number.NaN).success).toBe(false)
    expect(centsSchema.safeParse(Number.POSITIVE_INFINITY).success).toBe(false)
  })

  it('recusa string, mesmo string numerica', () => {
    expect(centsSchema.safeParse('1234').success).toBe(false)
  })
})

describe('rateSchema', () => {
  it('aceita fracao decimal', () => {
    expect(rateSchema.parse(0.015)).toBeCloseTo(0.015, 10)
  })

  it('aceita zero', () => {
    expect(rateSchema.parse(0)).toBe(0)
  })

  it('recusa negativo', () => {
    expect(rateSchema.safeParse(-0.01).success).toBe(false)
  })

  it('recusa taxa absurda, que quase sempre e percentual mandado sem dividir', () => {
    expect(rateSchema.safeParse(15).success).toBe(false)
  })

  it('recusa NaN', () => {
    expect(rateSchema.safeParse(Number.NaN).success).toBe(false)
  })
})

describe('a ponte com o dominio', () => {
  it('o que sai do parse entra no dominio sem cast', () => {
    // Este e o ponto inteiro do pacote: sem conversao, sem `as`, sem buraco.
    const tabela = price({
      principal: centsSchema.parse(1000000),
      monthlyRate: rateSchema.parse(0.01),
      termMonths: 12,
    })
    expect(tabela.settled).toBe(true)
    expect(tabela.totalPaid).toBeGreaterThan(1000000)
  })
})
