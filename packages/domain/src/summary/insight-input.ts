import { type Schedule } from '../amortization/schedule.js'
import { ZERO, add, type Cents } from '../money/decimal.js'

const FRACTIONS = [0.25, 0.5, 0.75] as const

export type MilestoneFraction = (typeof FRACTIONS)[number]

export interface Milestone {
  readonly fraction: MilestoneFraction
  readonly period: number
  readonly balance: Cents
}

/**
 * Tudo o que o modelo da Fase 6 enxerga de uma simulacao.
 *
 * O array de parcelas nunca entra aqui. A estrutura tem tamanho fixo e no
 * maximo tres marcos, entao o teto de 800 tokens da secao 6 do AGENTS.md e
 * garantido por construcao, e nao por contagem.
 *
 * Os campos monetarios continuam sendo `Cents`. A marca so existe em tempo de
 * compilacao, entao `JSON.stringify` ja entrega numero puro sem custo, e
 * degradar o tipo aqui so perderia verificacao dentro do dominio.
 */
export interface InsightInput {
  readonly kind: 'loan' | 'card'
  readonly principal: Cents
  readonly totalPaid: Cents
  readonly totalInterest: Cents
  readonly totalFees: Cents
  readonly interestOverPrincipalPercent: number
  readonly termMonths: number
  readonly settled: boolean
  readonly neverSettles: boolean
  readonly capReachedAtPeriod: number | null
  readonly milestones: readonly Milestone[]
}

export function summarizeForInsight(
  schedule: Schedule,
  kind: 'loan' | 'card',
  capReachedAtPeriod: number | null,
): InsightInput {
  const milestones: Milestone[] = []

  // Marco de amortizacao que nao aconteceu nao existe.
  if (schedule.settled) {
    let acumulado = ZERO
    let indice = 0
    for (const row of schedule.installments) {
      acumulado = add(acumulado, row.amortization)
      let fracao = FRACTIONS[indice]
      while (fracao !== undefined && acumulado >= schedule.principal * fracao) {
        milestones.push({ fraction: fracao, period: row.period, balance: row.closingBalance })
        indice += 1
        fracao = FRACTIONS[indice]
      }
    }
  }

  const interestOverPrincipalPercent =
    schedule.principal === ZERO
      ? 0
      : Math.round((schedule.totalInterest / schedule.principal) * 1000) / 10

  return {
    kind,
    principal: schedule.principal,
    totalPaid: schedule.totalPaid,
    totalInterest: schedule.totalInterest,
    totalFees: schedule.totalFees,
    interestOverPrincipalPercent,
    termMonths: schedule.termMonths,
    settled: schedule.settled,
    neverSettles: schedule.neverSettles,
    capReachedAtPeriod,
    milestones,
  }
}
