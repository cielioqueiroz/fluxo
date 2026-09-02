import type { InsightResponse } from '@fluxo/contracts'
import type { InsightInput } from '@fluxo/domain'
import { readonly, ref, type Ref } from 'vue'

import { fetchInsight } from '~~/lib/api-client'

export type InsightState = 'ocioso' | 'carregando' | 'pronto' | 'indisponivel'

export interface UseInsight {
  readonly state: Readonly<Ref<InsightState>>
  readonly response: Readonly<Ref<InsightResponse | null>>
  readonly request: (summary: InsightInput) => Promise<void>
}

/**
 * A leitura escrita pelo agente.
 *
 * **Melhoria progressiva, e nunca substituicao.** O resumo deterministico ja
 * esta na tela desde a Fase 3, e continua la enquanto isto carrega, falha, ou
 * volta degradado. Nenhum estado deste composable esconde o texto calculado.
 *
 * A chamada e explicita, e nao automatica ao digitar. Cada tecla mudaria o
 * cenario, e disparar por tecla gastaria a cota gratuita em uma sessao.
 */
export function useInsight(baseUrl: string): UseInsight {
  const state = ref<InsightState>('ocioso')
  const response = ref<InsightResponse | null>(null)

  let emCurso: AbortController | null = null

  const request = async (summary: InsightInput): Promise<void> => {
    // Pedido novo cancela o anterior: a resposta velha descreveria outro cenario.
    emCurso?.abort()
    emCurso = new AbortController()

    state.value = 'carregando'
    const resultado = await fetchInsight(baseUrl, summary, emCurso.signal)

    if (!resultado.ok) {
      state.value = 'indisponivel'
      response.value = null
      return
    }

    // Degradada e uma resposta valida sem texto do modelo. Para a tela, ela nao
    // difere de indisponivel: em ambos os casos o que fica e o resumo calculado.
    if (resultado.response.degraded) {
      state.value = 'indisponivel'
      response.value = null
      return
    }

    response.value = resultado.response
    state.value = 'pronto'
  }

  return {
    state: readonly(state),
    response: readonly(response) as Ref<InsightResponse | null>,
    request,
  }
}
