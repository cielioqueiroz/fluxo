/**
 * A porta do modelo de linguagem.
 *
 * Este arquivo e a unica coisa que o resto da aplicacao conhece sobre geracao
 * de texto. Nenhum modulo importa o SDK de nenhum provedor, e trocar de
 * provedor e escrever outro adapter que implemente esta interface.
 *
 * A interface e propositalmente pobre. Ela nao expoe temperatura, nem contagem
 * de tokens, nem streaming, porque o produto nao precisa de nada disso: ele
 * manda um resumo pequeno e espera um JSON de volta.
 */

export const LLM = Symbol('fluxo:llm')

export interface LlmRequest {
  /** Instrucao de sistema. Vem de um arquivo versionado, nunca de texto solto. */
  readonly system: string
  readonly user: string
  /** Teto de saida, para uma resposta longa demais nao consumir a cota. */
  readonly maxOutputTokens: number
}

export type LlmResult =
  { readonly ok: true; readonly text: string } | { readonly ok: false; readonly reason: LlmFailure }

/**
 * Por que a geracao falhou.
 *
 * Categorias, e nao mensagem crua do provedor, porque quem chama precisa
 * decidir o que fazer e nao precisa saber de quem veio o erro. `unavailable`
 * cobre o caso mais comum em producao: nao ha chave configurada.
 */
export type LlmFailure = 'unavailable' | 'quota' | 'timeout' | 'refused' | 'error'

export interface LlmPort {
  /**
   * Gera texto. Nunca lanca.
   *
   * O contrato de nao lancar e deliberado: a Fase 6 exige degradacao
   * silenciosa, e um adapter que lanca empurra o tratamento de falha para todo
   * chamador. Aqui a falha e um valor.
   */
  generate(request: LlmRequest): Promise<LlmResult>

  /** Vetor de embedding do texto, para o RAG. Nulo quando indisponivel. */
  embed(text: string): Promise<readonly number[] | null>

  /** Falso quando nao ha credencial. Quem chama decide se vale tentar. */
  isAvailable(): boolean
}
