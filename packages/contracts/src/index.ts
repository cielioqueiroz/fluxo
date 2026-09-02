/**
 * A fronteira entre o front e o back.
 *
 * `apps/web` e `apps/api` nao se enxergam. Tudo o que atravessa entre os dois
 * passa por um schema deste pacote, e o valor validado sai marcado, pronto para
 * entrar em `packages/domain` sem conversao.
 */

export { centsSchema, rateSchema, signedCentsSchema, termMonthsSchema } from './money.schema.js'

export {
  cardMetadataSchema,
  cardPresetSchema,
  cardSimulationInputSchema,
  comparisonSchema,
  installmentSchema,
  loanSimulationInputSchema,
  loanSystemSchema,
  paymentPolicySchema,
  scenarioSummarySchema,
  scheduleSchema,
  simulationInputSchema,
  simulationResultSchema,
  stageSchema,
  type CardPreset,
  type CardSimulationInput,
  type Comparison,
  type LoanSimulationInput,
  type LoanSystem,
  type ScenarioSummary,
  type SimulationInput,
  type SimulationResult,
} from './simulation.schema.js'

export {
  citationSchema,
  claimSchema,
  insightInputSchema,
  insightModelOutputSchema,
  insightResponseSchema,
  milestoneSchema,
  type Citation,
  type Claim,
  type InsightInput,
  type InsightModelOutput,
  type InsightResponse,
  type Milestone,
} from './insight.schema.js'
