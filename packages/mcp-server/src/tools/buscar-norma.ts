import { BRASIL, BRASIL_PROVENANCE, type ParamProvenance } from '@fluxo/domain'
import { z } from 'zod'

/**
 * `buscar_norma`.
 *
 * Devolve os parametros regulados do cartao de credito no Brasil, com a norma,
 * a URL e a data de vigencia de cada um, e diz explicitamente o que e lei e o
 * que e pratica de mercado.
 *
 * Le do preset do dominio, e nao de uma copia. Se a regra mudar, muda o preset e
 * esta ferramenta muda junto, sem ninguem lembrar de atualizar dois lugares. Nao
 * ha busca vetorial aqui: o conjunto e pequeno, fechado e exato, e um assistente
 * que pergunta "qual e o teto do rotativo" quer o numero, nao o trecho mais
 * parecido.
 */
export const buscarNormaSchema = z.object({
  campo: z
    .enum(['revolvingCycleLimit', 'minimumFraction', 'iof', 'totalChargeCap', 'todos'])
    .default('todos')
    .describe('Qual parametro consultar. `todos` devolve o conjunto inteiro'),
})

export type BuscarNormaInput = z.infer<typeof buscarNormaSchema>

export interface NormaEncontrada {
  readonly campo: string
  readonly valor: unknown
  readonly descricao: string
  readonly autoridade: string
  readonly fonte: string
  readonly vigenteDesde: string
  readonly natureza: 'norma' | 'pratica de mercado'
}

// Tipado pela uniao exata de campos, e nao por string: assim o indice e
// total e nao precisa de valor de reposicao, e esquecer de descrever um campo
// novo vira erro de compilacao em vez de string vazia na resposta.
const DESCRICAO: Record<ParamProvenance['field'], string> = {
  revolvingCycleLimit:
    'Quantos ciclos de fatura o saldo pode permanecer no credito rotativo antes de virar parcelamento obrigatorio.',
  minimumFraction:
    'Fracao da fatura cobrada no pagamento minimo, como fracao decimal. 0.15 significa 15%.',
  iof: 'Imposto sobre Operacoes Financeiras para credito de pessoa fisica: parcela fixa, parcela diaria e teto de dias da parcela diaria.',
  totalChargeCap:
    'Teto do total de juros e encargos, como fracao do valor original da divida, somando rotativo e parcelamento. 1 significa 100%.',
}

function montar(procedencia: ParamProvenance): NormaEncontrada {
  return {
    campo: procedencia.field,
    valor: BRASIL[procedencia.field],
    descricao: DESCRICAO[procedencia.field],
    autoridade: procedencia.authority,
    fonte: procedencia.source,
    vigenteDesde: procedencia.effectiveFrom,
    natureza: procedencia.kind === 'regulation' ? 'norma' : 'pratica de mercado',
  }
}

export function buscarNorma(entrada: BuscarNormaInput): readonly NormaEncontrada[] {
  if (entrada.campo === 'todos') {
    return BRASIL_PROVENANCE.map(montar)
  }
  return BRASIL_PROVENANCE.filter((procedencia) => procedencia.field === entrada.campo).map(montar)
}
