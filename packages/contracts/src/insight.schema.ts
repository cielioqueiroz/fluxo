import { z } from 'zod'

import { centsSchema } from './money.schema.js'

/* O que o modelo recebe
   ------------------------------------------------------------------------- */

export const milestoneSchema = z.strictObject({
  fraction: z.union([z.literal(0.25), z.literal(0.5), z.literal(0.75)]),
  period: z.number().int().positive(),
  balance: centsSchema,
})

/**
 * O resumo que a Fase 6 manda ao modelo, e nada alem dele.
 *
 * `strictObject` mais o teto de tres marcos e o que torna o orcamento de
 * contexto da secao 6 do AGENTS.md verificavel: se alguem tentar anexar o array
 * de parcelas, o schema recusa antes de a chamada sair.
 */
export const insightInputSchema = z.strictObject({
  kind: z.enum(['loan', 'card']),
  principal: centsSchema,
  totalPaid: centsSchema,
  totalInterest: centsSchema,
  totalFees: centsSchema,
  interestOverPrincipalPercent: z.number().nonnegative(),
  termMonths: z.number().int().nonnegative(),
  settled: z.boolean(),
  neverSettles: z.boolean(),
  capReachedAtPeriod: z.number().int().positive().nullable(),
  milestones: z.array(milestoneSchema).max(3),
})

/* O que o modelo devolve
   ------------------------------------------------------------------------- */

/** En dash e em dash, escritos como escape para o proprio arquivo passar na
    verificacao de travessao do CI. */
const TRAVESSAO = /[\u2013\u2014]/

/**
 * Texto vindo do modelo.
 *
 * A regra 4 da secao 2 do AGENTS.md proibe travessao na saida da IA. Pedir isso
 * no prompt e esperanca. Recusar aqui e garantia, e o retry da Fase 6 tem uma
 * mensagem concreta para corrigir.
 */
const modelText = (max: number) =>
  z
    .string()
    .min(1)
    .max(max)
    .refine((texto) => !TRAVESSAO.test(texto), 'Travessao proibido, use virgula ou ponto final')

export const citationSchema = z.strictObject({
  source: modelText(200),
  url: z.url(),
  excerpt: modelText(400),
})

export const claimSchema = z.strictObject({
  text: modelText(400),
  /** Indice na lista de citacoes. Afirmacao sem lastro nao chega a UI. */
  citationIndex: z.number().int().nonnegative(),
})

export const insightModelOutputSchema = z
  .strictObject({
    headline: modelText(120),
    reading: modelText(1200),
    claims: z.array(claimSchema).max(5),
    citations: z.array(citationSchema).max(5),
  })
  .superRefine((valor, ctx) => {
    for (const [indice, claim] of valor.claims.entries()) {
      if (claim.citationIndex >= valor.citations.length) {
        ctx.addIssue({
          code: 'custom',
          path: ['claims', indice, 'citationIndex'],
          message:
            valor.citations.length === 0
              ? 'Afirmacao sem nenhuma citacao para sustenta-la'
              : `Citacao ${claim.citationIndex} nao existe: ha ${valor.citations.length}`,
        })
      }
    }
  })

/* O que a API devolve ao front
   ------------------------------------------------------------------------- */

export const insightResponseSchema = z.strictObject({
  headline: modelText(120),
  reading: modelText(1200),
  claims: z.array(claimSchema).max(5),
  citations: z.array(citationSchema).max(5),
  /** Aviso de material educativo. Campo do servidor, nunca texto do modelo. */
  disclaimer: z.string().min(1),
  promptVersion: z.string().min(1),
  promptHash: z
    .string()
    .regex(/^[0-9a-f]{64}$/, 'Hash de prompt precisa ser sha256 em hexadecimal'),
  /** Verdadeiro quando o modelo falhou e o resumo deterministico tomou o lugar. */
  degraded: z.boolean(),
})

/* Tipos inferidos
   ------------------------------------------------------------------------- */

export type Milestone = z.infer<typeof milestoneSchema>
export type InsightInput = z.infer<typeof insightInputSchema>
export type Citation = z.infer<typeof citationSchema>
export type Claim = z.infer<typeof claimSchema>
export type InsightModelOutput = z.infer<typeof insightModelOutputSchema>
export type InsightResponse = z.infer<typeof insightResponseSchema>
