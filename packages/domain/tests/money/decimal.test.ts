import { describe, expect, it } from 'vitest'

import {
  ZERO,
  add,
  cents,
  distributeOverInstallments,
  largest,
  roundHalfUp,
  smallest,
  sub,
} from '../../src/money/decimal.js'

describe('cents', () => {
  it('aceita inteiro', () => {
    expect(cents(1234)).toBe(1234)
  })

  it('recusa fracao, porque centavo fracionario e bug', () => {
    expect(() => cents(12.5)).toThrow(RangeError)
  })

  it('recusa nao finito', () => {
    expect(() => cents(Number.POSITIVE_INFINITY)).toThrow(RangeError)
  })
})

describe('roundHalfUp', () => {
  it('arredonda meio para cima no positivo', () => {
    expect(roundHalfUp(0.5)).toBe(1)
    expect(roundHalfUp(1.5)).toBe(2)
  })

  it('arredonda afastando do zero no negativo, diferente de Math.round', () => {
    expect(roundHalfUp(-0.5)).toBe(-1)
    expect(Math.round(-0.5)).toBe(-0)
  })
})

describe('aritmetica', () => {
  it('soma e subtrai mantendo a marca', () => {
    expect(add(cents(100), cents(23))).toBe(123)
    expect(sub(cents(100), cents(23))).toBe(77)
  })

  it('ZERO e zero', () => {
    expect(ZERO).toBe(0)
  })

  it('smallest devolve o menor dos dois, nos dois sentidos', () => {
    expect(smallest(cents(100), cents(23))).toBe(23)
    expect(smallest(cents(23), cents(100))).toBe(23)
  })

  it('smallest com valores iguais devolve o valor', () => {
    expect(smallest(cents(50), cents(50))).toBe(50)
  })

  it('largest devolve o maior dos dois, nos dois sentidos', () => {
    expect(largest(cents(100), cents(23))).toBe(100)
    expect(largest(cents(23), cents(100))).toBe(100)
  })

  it('largest com valores iguais devolve o valor', () => {
    expect(largest(cents(50), cents(50))).toBe(50)
  })
})

describe('distributeOverInstallments', () => {
  it('reparte igualmente quando divide exato', () => {
    expect(distributeOverInstallments(cents(9000), 3)).toEqual([3000, 3000, 3000])
  })

  it('poe o residuo na ultima parcela', () => {
    expect(distributeOverInstallments(cents(10000), 3)).toEqual([3333, 3333, 3334])
  })

  it('devolve o total inteiro quando ha uma parcela so', () => {
    expect(distributeOverInstallments(cents(10000), 1)).toEqual([10000])
  })

  it('reparte zero sem inventar centavo', () => {
    expect(distributeOverInstallments(ZERO, 12)).toEqual(Array<number>(12).fill(0))
  })

  it('nunca perde centavo, para qualquer total e qualquer prazo', () => {
    for (const total of [1, 7, 99, 100000, 123457]) {
      for (const parts of [1, 2, 3, 7, 12, 360]) {
        const partes = distributeOverInstallments(cents(total), parts)
        expect(partes).toHaveLength(parts)
        expect(partes.reduce<number>((a, b) => a + b, 0)).toBe(total)
      }
    }
  })

  it('recusa prazo zero', () => {
    expect(() => distributeOverInstallments(cents(100), 0)).toThrow(RangeError)
  })
})
