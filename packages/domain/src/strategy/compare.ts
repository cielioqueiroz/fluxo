import { price, type LoanInput } from '../amortization/price.js'
import { type Schedule } from '../amortization/schedule.js'
import { sub, type Cents } from '../money/decimal.js'
import { rate, type Rate } from '../money/rate.js'
import { prepayWithMonthlyExtra } from './prepayment.js'

export interface ScenarioSummary {
  readonly totalPaid: Cents
  readonly totalInterest: Cents
  readonly termMonths: number
  readonly savedVersusKeep: Cents
  readonly savedVersusKeepMonths: number
}

export interface Comparison {
  readonly keep: ScenarioSummary
  readonly prepay: ScenarioSummary
  readonly portability: {
    /** Abaixo desta taxa, portar ganha de pagar mais por mes. */
    readonly breakEvenMonthlyRate: Rate
    readonly atTargetRate: ScenarioSummary | null
  }
}

const BISSECTION_STEPS = 60

/**
 * A taxa de destino na qual portar economiza exatamente o mesmo que o aporte.
 *
 * A raiz sempre existe: com taxa zero o total pago e o proprio principal, e
 * nenhuma estrategia de pagamento fica abaixo do principal. Como o total pago
 * cresce monotonicamente com a taxa, a bissecao converge sempre, e a funcao
 * nunca precisa devolver nulo.
 */
export function portabilityBreakEven(loan: LoanInput, extra: Cents): Rate {
  const alvo = prepayWithMonthlyExtra(loan, extra).totalPaid

  let baixo = 0
  let alto: number = loan.monthlyRate

  for (let i = 0; i < BISSECTION_STEPS; i += 1) {
    const meio = (baixo + alto) / 2
    if (price({ ...loan, monthlyRate: rate(meio) }).totalPaid < alvo) {
      baixo = meio
    } else {
      alto = meio
    }
  }

  return rate((baixo + alto) / 2)
}

function summarize(schedule: Schedule, keep: Schedule): ScenarioSummary {
  return {
    totalPaid: schedule.totalPaid,
    totalInterest: schedule.totalInterest,
    termMonths: schedule.termMonths,
    savedVersusKeep: sub(keep.totalPaid, schedule.totalPaid),
    savedVersusKeepMonths: keep.termMonths - schedule.termMonths,
  }
}

/**
 * Manter e antecipar sao cenarios. Portar nao e.
 *
 * Na taxa de equilibrio, portar economiza por definicao o mesmo que antecipar,
 * entao apresenta-la como um terceiro numero de economia seria enfeite. O que
 * ela e, e um limiar. Com `targetRate` preenchido, `atTargetRate` traz a
 * economia concreta daquela taxa.
 */
export function compare(loan: LoanInput, extra: Cents, targetRate: Rate | null): Comparison {
  const keep = price(loan)
  const prepay = prepayWithMonthlyExtra(loan, extra)

  return {
    keep: summarize(keep, keep),
    prepay: summarize(prepay, keep),
    portability: {
      breakEvenMonthlyRate: portabilityBreakEven(loan, extra),
      atTargetRate:
        targetRate === null ? null : summarize(price({ ...loan, monthlyRate: targetRate }), keep),
    },
  }
}
