import { compare, rate } from '@fluxo/domain'
import { z } from 'zod'

import { AVISO, paraCentavos, paraReais } from './simular-financiamento.js'

/**
 * `comparar_cenarios`.
 *
 * Manter, antecipar e o limiar da portabilidade. Portar nao e um terceiro
 * cenario: na taxa de equilibrio ele economiza por definicao o mesmo que
 * antecipar, entao o numero util e a taxa que a pessoa precisa procurar no
 * mercado. Ver ADR 0007 e a secao 9 da especificacao do dominio.
 */
export const compararCenariosSchema = z.object({
  valor: z.number().positive().describe('Saldo devedor atual, em reais'),
  taxaMensal: z.number().min(0).max(100).describe('Taxa mensal atual, em percentual'),
  prazoMeses: z.number().int().min(1).max(600).describe('Prazo restante, em meses'),
  aporteMensal: z
    .number()
    .min(0)
    .describe('Quanto a pessoa consegue pagar a mais por mes, em reais'),
  taxaDeDestino: z
    .number()
    .min(0)
    .max(100)
    .optional()
    .describe('Taxa de outra instituicao, em percentual. Sem ela, devolve apenas o limiar'),
})

export type CompararCenariosInput = z.infer<typeof compararCenariosSchema>

interface Cenario {
  readonly totalPago: number
  readonly totalJuros: number
  readonly prazoMeses: number
  readonly economiaEmReais: number
  readonly economiaEmMeses: number
}

export interface Comparacao {
  readonly manter: Cenario
  readonly antecipar: Cenario
  readonly portabilidade: {
    readonly taxaDeEquilibrioMensalPercent: number
    readonly explicacao: string
    readonly naTaxaDeDestino: Cenario | null
  }
  readonly aviso: string
}

export function compararCenarios(entrada: CompararCenariosInput): Comparacao {
  const emprestimo = {
    principal: paraCentavos(entrada.valor),
    monthlyRate: rate(entrada.taxaMensal / 100),
    termMonths: entrada.prazoMeses,
  }

  const destino = entrada.taxaDeDestino === undefined ? null : rate(entrada.taxaDeDestino / 100)
  const resultado = compare(emprestimo, paraCentavos(entrada.aporteMensal), destino)

  const traduzir = (cenario: {
    totalPaid: number
    totalInterest: number
    termMonths: number
    savedVersusKeep: number
    savedVersusKeepMonths: number
  }): Cenario => ({
    totalPago: paraReais(cenario.totalPaid),
    totalJuros: paraReais(cenario.totalInterest),
    prazoMeses: cenario.termMonths,
    economiaEmReais: paraReais(cenario.savedVersusKeep),
    economiaEmMeses: cenario.savedVersusKeepMonths,
  })

  const equilibrio = resultado.portability.breakEvenMonthlyRate * 100

  return {
    manter: traduzir(resultado.keep),
    antecipar: traduzir(resultado.prepay),
    portabilidade: {
      taxaDeEquilibrioMensalPercent: Math.round(equilibrio * 10000) / 10000,
      explicacao: `Trocar de instituicao so ganha de pagar mais por mes se a taxa de destino ficar abaixo de ${equilibrio.toFixed(4)}% ao mes. Exatamente nessa taxa, as duas estrategias economizam o mesmo.`,
      naTaxaDeDestino:
        resultado.portability.atTargetRate === null
          ? null
          : traduzir(resultado.portability.atTargetRate),
    },
    aviso: AVISO,
  }
}
