import { rate } from '../../money/rate.js'
import { type CardParams, type ParamProvenance } from '../params.js'

/**
 * Parametros do cartao de credito no Brasil.
 *
 * Nenhum destes valores aparece dentro do calculo. Quando a regra mudar, muda
 * este arquivo, e nenhum teste de calculo e tocado.
 */
export const BRASIL: CardParams = {
  revolvingCycleLimit: 1,
  minimumFraction: rate(0.15),
  iof: { fixed: rate(0.0038), daily: rate(0.000082), dailyCapDays: 365 },
  totalChargeCap: rate(1),
}

/**
 * A fonte de cada parametro, como dado e nao como comentario.
 *
 * A Fase 6 vai citar estes mesmos enderecos, e nao pode inventa-los.
 */
export const BRASIL_PROVENANCE: readonly ParamProvenance[] = [
  {
    field: 'revolvingCycleLimit',
    authority:
      'Resolucao CMN 4.549, de 26 de janeiro de 2017. O saldo so fica no rotativo ate o vencimento da fatura seguinte, e depois vira parcelamento',
    source: 'https://normativos.bcb.gov.br/Lists/Normativos/Attachments/50330/Res_4549_v1_O.pdf',
    effectiveFrom: '2017-04-03',
    kind: 'regulation',
  },
  {
    field: 'totalChargeCap',
    authority:
      'Lei 14.690, de 3 de outubro de 2023, regulamentada pela Resolucao CMN 5.112. Juros e encargos somados nao passam de 100% do valor original da divida',
    source: 'https://www.planalto.gov.br/ccivil_03/_ato2023-2026/2023/lei/l14690.htm',
    effectiveFrom: '2024-01-03',
    kind: 'regulation',
  },
  {
    field: 'iof',
    authority:
      'IOF de credito para pessoa fisica: 0,38% fixo mais 0,0082% ao dia, com a parcela diaria limitada a 365 dias',
    source: 'https://www.gov.br/receitafederal/pt-br/assuntos/orientacao-tributaria/tributos/iof',
    effectiveFrom: '2025-07-01',
    kind: 'regulation',
  },
  {
    field: 'minimumFraction',
    authority:
      'Pratica de mercado, nao norma. O minimo de 15% veio da Circular BCB 3.512 de 2010 e nao e mais obrigatorio: hoje cada instituicao fixa o seu percentual',
    source: 'https://www.bcb.gov.br/estabilidadefinanceira/buscanormas',
    effectiveFrom: '2017-04-03',
    kind: 'market-practice',
  },
]
