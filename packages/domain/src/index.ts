/**
 * Superficie publica do dominio.
 *
 * Tudo o que o front, a API e o servidor MCP consomem passa por aqui. Se um
 * numero aparece em qualquer lugar do produto, ele saiu de uma destas funcoes.
 */

export {
  ZERO,
  add,
  cents,
  distributeOverInstallments,
  roundHalfUp,
  smallest,
  sub,
  type Cents,
} from './money/decimal.js'

export {
  ZERO_RATE,
  applyRate,
  fromAnnual,
  fromPercent,
  rate,
  toAnnual,
  type Rate,
} from './money/rate.js'

export {
  buildSchedule,
  closeRow,
  type BuildOptions,
  type Installment,
  type Schedule,
  type Stage,
} from './amortization/schedule.js'

export { assertTerm, price, pricePayment, type LoanInput } from './amortization/price.js'
export { sac } from './amortization/sac.js'

export {
  type CardInput,
  type CardParams,
  type IofParams,
  type ParamProvenance,
  type PaymentPolicy,
} from './credit-card/params.js'
export { resolvePayment } from './credit-card/minimum-payment.js'
export { revolvingStage, type RevolvingInput, type StageResult } from './credit-card/revolving.js'
export { cardDebt, type CardOutcome } from './credit-card/card-debt.js'
export { BRASIL, BRASIL_PROVENANCE } from './credit-card/presets/brasil.js'

export { prepayWithMonthlyExtra } from './strategy/prepayment.js'
export {
  compare,
  portabilityBreakEven,
  type Comparison,
  type ScenarioSummary,
} from './strategy/compare.js'

export {
  summarizeForInsight,
  type InsightInput,
  type Milestone,
  type MilestoneFraction,
} from './summary/insight-input.js'
