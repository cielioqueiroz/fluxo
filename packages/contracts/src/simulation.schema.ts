import { z } from 'zod'

import { centsSchema, rateSchema, signedCentsSchema, termMonthsSchema } from './money.schema.js'

/* Entrada
   ------------------------------------------------------------------------- */

export const loanSystemSchema = z.enum(['price', 'sac'])

export const loanSimulationInputSchema = z.strictObject({
  kind: z.literal('loan'),
  principal: centsSchema,
  monthlyRate: rateSchema,
  termMonths: termMonthsSchema,
  system: loanSystemSchema,
  /** Aporte mensal recorrente. Zero quando o usuario nao antecipa nada. */
  monthlyExtra: centsSchema,
})

export const paymentPolicySchema = z.discriminatedUnion('kind', [
  z.strictObject({ kind: z.literal('minimum') }),
  z.strictObject({ kind: z.literal('fixed'), amount: centsSchema }),
  z.strictObject({ kind: z.literal('full') }),
])

/**
 * Qual preset de regulacao o servidor deve aplicar.
 *
 * O cliente manda um nome, nunca o objeto `CardParams`. Regulacao nao viaja
 * pela rede: se viajasse, qualquer um poderia simular um teto de encargos que
 * a lei nao permite e a pagina exibiria o numero como se fosse real.
 */
export const cardPresetSchema = z.enum(['brasil'])

export const cardSimulationInputSchema = z.strictObject({
  kind: z.literal('card'),
  invoice: centsSchema,
  revolvingRate: rateSchema,
  installmentRate: rateSchema,
  /** Zero quer dizer que nao ha parcelamento depois do rotativo. */
  installmentTermMonths: z.number().int().min(0).max(600),
  policy: paymentPolicySchema,
  preset: cardPresetSchema,
})

export const simulationInputSchema = z.discriminatedUnion('kind', [
  loanSimulationInputSchema,
  cardSimulationInputSchema,
])

/* Saida
   ------------------------------------------------------------------------- */

export const stageSchema = z.enum(['loan', 'revolving', 'installment'])

export const installmentSchema = z.strictObject({
  period: z.number().int().positive(),
  stage: stageSchema,
  openingBalance: centsSchema,
  interest: centsSchema,
  fees: centsSchema,
  /** Negativa quando o pagamento nao cobre os encargos. */
  amortization: signedCentsSchema,
  payment: centsSchema,
  closingBalance: centsSchema,
})

export const scheduleSchema = z.strictObject({
  installments: z.array(installmentSchema),
  principal: centsSchema,
  totalPaid: centsSchema,
  totalInterest: centsSchema,
  totalFees: centsSchema,
  finalBalance: centsSchema,
  settled: z.boolean(),
  neverSettles: z.boolean(),
  termMonths: z.number().int().nonnegative(),
})

export const scenarioSummarySchema = z.strictObject({
  totalPaid: centsSchema,
  totalInterest: centsSchema,
  termMonths: z.number().int().nonnegative(),
  savedVersusKeep: signedCentsSchema,
  savedVersusKeepMonths: z.number().int(),
})

export const comparisonSchema = z.strictObject({
  keep: scenarioSummarySchema,
  prepay: scenarioSummarySchema,
  portability: z.strictObject({
    breakEvenMonthlyRate: rateSchema,
    atTargetRate: scenarioSummarySchema.nullable(),
  }),
})

export const cardMetadataSchema = z.strictObject({
  capReachedAtPeriod: z.number().int().positive().nullable(),
  revolvingEndedAtPeriod: z.number().int().positive().nullable(),
})

export const simulationResultSchema = z.strictObject({
  schedule: scheduleSchema,
  /** Nulo no cartao, que nao tem estrategia de antecipacao nesta fase. */
  comparison: comparisonSchema.nullable(),
  /** Nulo no emprestimo. */
  card: cardMetadataSchema.nullable(),
})

/* Tipos inferidos
   ------------------------------------------------------------------------- */

export type LoanSystem = z.infer<typeof loanSystemSchema>
export type LoanSimulationInput = z.infer<typeof loanSimulationInputSchema>
export type CardSimulationInput = z.infer<typeof cardSimulationInputSchema>
export type SimulationInput = z.infer<typeof simulationInputSchema>
export type CardPreset = z.infer<typeof cardPresetSchema>
export type SimulationResult = z.infer<typeof simulationResultSchema>
export type Comparison = z.infer<typeof comparisonSchema>
export type ScenarioSummary = z.infer<typeof scenarioSummarySchema>
