declare const centsBrand: unique symbol

/** Dinheiro em centavos inteiros. Ponto flutuante em calculo monetario e bug. */
export type Cents = number & { readonly [centsBrand]: 'Cents' }

export const ZERO = 0 as Cents

export function cents(value: number): Cents {
  if (!Number.isSafeInteger(value)) {
    throw new RangeError(`Dinheiro precisa ser inteiro seguro em centavos, recebido ${value}`)
  }
  return value as Cents
}

/**
 * Meio para cima, afastando do zero.
 *
 * `Math.round` sozinho nao serve: ele arredonda para o infinito positivo, entao
 * trata -0.5 e 0.5 de formas diferentes.
 */
export function roundHalfUp(value: number): number {
  return value < 0 ? -Math.round(-value) : Math.round(value)
}

export const add = (a: Cents, b: Cents): Cents => cents(a + b)
export const sub = (a: Cents, b: Cents): Cents => cents(a - b)
export const smallest = (a: Cents, b: Cents): Cents => (a <= b ? a : b)
export const largest = (a: Cents, b: Cents): Cents => (a >= b ? a : b)

/**
 * Reparte um total em parcelas iguais e poe o residuo na ultima.
 *
 * O `allocate` do padrao Money de Fowler poe o resto nas primeiras partes, em
 * rodizio, para que nenhuma parte fique sempre com o troco. Aquilo resolve
 * repartir entre partes. Isto e amortizacao, e a convencao e a ultima parcela
 * absorver o residuo.
 */
export function distributeOverInstallments(total: Cents, parts: number): readonly Cents[] {
  if (!Number.isSafeInteger(parts) || parts < 1) {
    throw new RangeError(`Prazo precisa ser inteiro positivo, recebido ${parts}`)
  }
  const base = Math.trunc(total / parts)
  const residue = total - base * parts
  const result: Cents[] = Array<Cents>(parts).fill(cents(base))
  result[parts - 1] = cents(base + residue)
  return result
}
