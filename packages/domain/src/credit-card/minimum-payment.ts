import { ZERO, smallest, type Cents } from '../money/decimal.js'
import { applyRate, type Rate } from '../money/rate.js'
import { type PaymentPolicy } from './params.js'

export function resolvePayment(
  invoice: Cents,
  policy: PaymentPolicy,
  minimumFraction: Rate,
): Cents {
  if (invoice <= ZERO) {
    return ZERO
  }
  switch (policy.kind) {
    case 'full':
      return invoice
    case 'fixed':
      return smallest(invoice, policy.amount)
    case 'minimum': {
      const minimum = applyRate(invoice, minimumFraction)
      // Minimo que arredonda para zero nunca quitaria. Quita agora.
      return minimum <= ZERO ? invoice : smallest(invoice, minimum)
    }
  }
}
