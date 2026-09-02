import { cents, roundHalfUp, type Cents } from './decimal.js'

declare const rateBrand: unique symbol

/** Fracao decimal ao mes. 0.015 e um e meio por cento ao mes, nunca 1.5. */
export type Rate = number & { readonly [rateBrand]: 'Rate' }

export function rate(fraction: number): Rate {
  if (!Number.isFinite(fraction) || fraction < 0) {
    throw new RangeError(`Taxa precisa ser finita e nao negativa, recebido ${fraction}`)
  }
  return fraction as Rate
}

export const ZERO_RATE = rate(0)

export const fromPercent = (percent: number): Rate => rate(percent / 100)
export const toAnnual = (monthly: Rate): Rate => rate((1 + monthly) ** 12 - 1)
export const fromAnnual = (annual: Rate): Rate => rate((1 + annual) ** (1 / 12) - 1)

/**
 * Multiplica dinheiro por taxa e arredonda para centavo.
 *
 * Mora aqui, e nao em decimal.ts, porque exigir uma `Rate` de verdade impede
 * passar 1.5 no lugar de 0.015, e porque decimal.ts nao pode conhecer Rate sem
 * criar importacao circular.
 */
export const applyRate = (amount: Cents, r: Rate): Cents => cents(roundHalfUp(amount * r))
