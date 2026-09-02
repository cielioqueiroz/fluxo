import { cardDebt, price, summarizeForInsight, BRASIL } from '@fluxo/domain'
import { describe, expect, it } from 'vitest'

import * as contracts from '../src/index.js'

describe('superficie publica', () => {
  it('exporta os schemas que as bordas precisam', () => {
    const esperado = [
      'centsSchema',
      'rateSchema',
      'signedCentsSchema',
      'termMonthsSchema',
      'simulationInputSchema',
      'simulationResultSchema',
      'scheduleSchema',
      'comparisonSchema',
      'insightInputSchema',
      'insightModelOutputSchema',
      'insightResponseSchema',
    ]
    for (const nome of esperado) {
      expect(Object.keys(contracts), `falta exportar ${nome}`).toContain(nome)
    }
  })

  it('o resumo que o dominio produz atravessa o schema do insight sem ajuste', () => {
    const tabela = price({
      principal: contracts.centsSchema.parse(1000000),
      monthlyRate: contracts.rateSchema.parse(0.02),
      termMonths: 24,
    })
    const resumo = summarizeForInsight(tabela, 'loan', null)
    expect(contracts.insightInputSchema.safeParse(resumo).success).toBe(true)
  })

  it('a tabela que o dominio produz atravessa o schema de saida sem ajuste', () => {
    const resultado = cardDebt({
      invoice: contracts.centsSchema.parse(250000),
      revolvingRate: contracts.rateSchema.parse(0.14),
      installmentRate: contracts.rateSchema.parse(0.07),
      installmentTermMonths: 12,
      policy: { kind: 'minimum' },
      params: BRASIL,
    })
    expect(contracts.scheduleSchema.safeParse(resultado.schedule).success).toBe(true)
  })
})
