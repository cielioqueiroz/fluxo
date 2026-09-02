import { describe, expect, it } from 'vitest'

import {
  insightInputSchema,
  insightModelOutputSchema,
  insightResponseSchema,
} from '../src/insight.schema.js'

const resumo = {
  kind: 'loan',
  principal: 1000000,
  totalPaid: 1195000,
  totalInterest: 195000,
  totalFees: 0,
  interestOverPrincipalPercent: 19.5,
  termMonths: 24,
  settled: true,
  neverSettles: false,
  capReachedAtPeriod: null,
  milestones: [
    { fraction: 0.25, period: 7, balance: 750000 },
    { fraction: 0.5, period: 13, balance: 500000 },
    { fraction: 0.75, period: 19, balance: 250000 },
  ],
} as const

const saida = {
  headline: 'Os juros somam quase um quinto do valor emprestado',
  reading:
    'Ao longo de 24 meses voce devolve 11.950,00 por um emprestimo de 10.000,00. A metade da divida so e amortizada no mes 13.',
  claims: [
    {
      text: 'Pagar um valor a mais todo mes reduz o prazo antes de reduzir o custo total.',
      citationIndex: 0,
    },
  ],
  citations: [
    {
      source: 'Banco Central do Brasil, Caderno de Educacao Financeira',
      url: 'https://www.bcb.gov.br/cidadaniafinanceira',
      excerpt: 'A amortizacao antecipada reduz o saldo devedor e os juros futuros.',
    },
  ],
} as const

describe('insightInputSchema', () => {
  it('aceita o resumo que o dominio produz', () => {
    expect(insightInputSchema.parse(resumo).termMonths).toBe(24)
  })

  it('aceita cenario que nunca quita, com marcos vazios', () => {
    const naoQuita = { ...resumo, settled: false, neverSettles: true, milestones: [] }
    expect(insightInputSchema.parse(naoQuita).neverSettles).toBe(true)
  })

  it('recusa fracao de marco fora de 25, 50 e 75', () => {
    const torto = { ...resumo, milestones: [{ fraction: 0.6, period: 5, balance: 100 }] }
    expect(insightInputSchema.safeParse(torto).success).toBe(false)
  })

  it('recusa mais de tres marcos, porque o orcamento de contexto e fixo', () => {
    const demais = { ...resumo, milestones: [...resumo.milestones, ...resumo.milestones] }
    expect(insightInputSchema.safeParse(demais).success).toBe(false)
  })

  it('recusa o array de parcelas, que nunca deve chegar ao modelo', () => {
    const vazando = { ...resumo, installments: [{ period: 1 }] }
    expect(insightInputSchema.safeParse(vazando).success).toBe(false)
  })
})

describe('insightModelOutputSchema', () => {
  it('aceita uma saida bem formada', () => {
    expect(insightModelOutputSchema.parse(saida).claims).toHaveLength(1)
  })

  it('aceita leitura sem nenhuma afirmacao, e ai sem citacao', () => {
    expect(
      insightModelOutputSchema.safeParse({ ...saida, claims: [], citations: [] }).success,
    ).toBe(true)
  })

  it('recusa afirmacao sem citacao nenhuma', () => {
    expect(insightModelOutputSchema.safeParse({ ...saida, citations: [] }).success).toBe(false)
  })

  it('recusa afirmacao apontando para citacao inexistente', () => {
    const forade = { ...saida, claims: [{ text: 'Algo.', citationIndex: 7 }] }
    expect(insightModelOutputSchema.safeParse(forade).success).toBe(false)
  })

  it('recusa citacao sem URL valida', () => {
    const semUrl = { ...saida, citations: [{ ...saida.citations[0], url: 'nao e url' }] }
    expect(insightModelOutputSchema.safeParse(semUrl).success).toBe(false)
  })

  it('recusa travessao na saida do modelo, que a regra 4 do AGENTS.md proibe', () => {
    const comTravessao = {
      ...saida,
      headline: 'Os juros somam quase um quinto — e isso e muito',
    }
    const resultado = insightModelOutputSchema.safeParse(comTravessao)
    expect(resultado.success).toBe(false)
    expect(JSON.stringify(resultado.error?.issues)).toMatch(/travessao/i)
  })

  it('recusa travessao tambem dentro de uma afirmacao', () => {
    const comTravessao = {
      ...saida,
      claims: [{ text: 'Pagar a mais – reduz o prazo.', citationIndex: 0 }],
    }
    expect(insightModelOutputSchema.safeParse(comTravessao).success).toBe(false)
  })

  it('recusa leitura vazia', () => {
    expect(insightModelOutputSchema.safeParse({ ...saida, reading: '' }).success).toBe(false)
  })

  it('recusa campo desconhecido inventado pelo modelo', () => {
    expect(
      insightModelOutputSchema.safeParse({ ...saida, recomendacao: 'Contrate no banco X' }).success,
    ).toBe(false)
  })
})

describe('insightResponseSchema', () => {
  const resposta = {
    ...saida,
    disclaimer: 'Material educativo. Nao e recomendacao de investimento.',
    promptVersion: 'insight.v1',
    promptHash: 'a'.repeat(64),
    degraded: false,
  }

  it('aceita a resposta completa da API', () => {
    expect(insightResponseSchema.parse(resposta).promptVersion).toBe('insight.v1')
  })

  it('exige hash de prompt com 64 hexadecimais', () => {
    expect(insightResponseSchema.safeParse({ ...resposta, promptHash: 'curto' }).success).toBe(
      false,
    )
  })

  it('exige o aviso como campo, nunca solto no texto', () => {
    const semAviso: Record<string, unknown> = { ...resposta }
    delete semAviso['disclaimer']
    expect(insightResponseSchema.safeParse(semAviso).success).toBe(false)
  })

  it('aceita resposta degradada, que e o resumo deterministico sem o modelo', () => {
    const degradada = { ...resposta, claims: [], citations: [], degraded: true }
    expect(insightResponseSchema.parse(degradada).degraded).toBe(true)
  })
})
