import { insightResponseSchema, type InsightResponse } from '@fluxo/contracts'
import type { InsightInput } from '@fluxo/domain'

/**
 * O cliente da API, tipado por `packages/contracts`.
 *
 * Valida a resposta com o mesmo schema que a API usou para produzi-la. Isso
 * pode parecer redundante e nao e: a API pode estar em outra versao, o Render
 * pode devolver uma pagina de erro em HTML durante o cold start, e um proxy
 * pode reescrever o corpo. Confiar na forma sem conferir e o tipo de suposicao
 * que quebra a pagina no unico momento em que ela nao pode quebrar.
 */

export type InsightFailure = 'sem-api' | 'rede' | 'formato' | 'servidor'

export type InsightOutcome =
  | { readonly ok: true; readonly response: InsightResponse }
  | { readonly ok: false; readonly reason: InsightFailure }

/** O cold start do plano gratuito do Render pode passar de trinta segundos. */
const TIMEOUT_MS = 45_000

export async function fetchInsight(
  baseUrl: string,
  summary: InsightInput,
  signal?: AbortSignal,
): Promise<InsightOutcome> {
  if (baseUrl === '') {
    return { ok: false, reason: 'sem-api' }
  }

  const controlador = new AbortController()
  const relogio = setTimeout(() => {
    controlador.abort()
  }, TIMEOUT_MS)

  // Cancelamento do chamador e o timeout, juntos.
  signal?.addEventListener('abort', () => {
    controlador.abort()
  })

  try {
    const resposta = await fetch(`${baseUrl.replace(/\/$/, '')}/insight`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(summary),
      signal: controlador.signal,
    })

    if (!resposta.ok) {
      return { ok: false, reason: 'servidor' }
    }

    const conferida = insightResponseSchema.safeParse(await resposta.json())
    if (!conferida.success) {
      return { ok: false, reason: 'formato' }
    }
    return { ok: true, response: conferida.data }
  } catch {
    return { ok: false, reason: 'rede' }
  } finally {
    clearTimeout(relogio)
  }
}
