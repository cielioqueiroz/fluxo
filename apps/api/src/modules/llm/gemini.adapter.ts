import { Inject, Injectable, Logger } from '@nestjs/common'

import { ENV } from '../../config/config.module.js'
import type { Env } from '../../config/env.schema.js'
import type { LlmFailure, LlmPort, LlmRequest, LlmResult } from './llm.port.js'

const BASE = 'https://generativelanguage.googleapis.com/v1beta'

/** Modelos da cota gratuita do Google AI Studio. */
const MODELO_TEXTO = 'gemini-2.5-flash'
const MODELO_EMBEDDING = 'text-embedding-004'

/** Depois disso, desistir custa menos que esperar. */
const TIMEOUT_MS = 20_000

interface RespostaGemini {
  candidates?: { content?: { parts?: { text?: string }[] }; finishReason?: string }[]
}

interface RespostaEmbedding {
  embedding?: { values?: number[] }
}

/**
 * O unico arquivo do projeto que sabe que existe Gemini.
 *
 * Usa `fetch` direto, e nao o SDK oficial. O SDK traz autenticacao por conta de
 * servico, streaming, upload de arquivo e contagem de tokens, e este produto
 * faz duas chamadas: gerar um JSON curto e pedir um embedding. A regra 5 da
 * secao 8 do AGENTS.md manda justificar dependencia nova, e nao havia o que
 * justificar.
 */
@Injectable()
export class GeminiAdapter implements LlmPort {
  private readonly logger = new Logger(GeminiAdapter.name)

  constructor(@Inject(ENV) private readonly env: Env) {}

  isAvailable(): boolean {
    return this.env.GEMINI_API_KEY !== undefined
  }

  async generate(request: LlmRequest): Promise<LlmResult> {
    const chave = this.env.GEMINI_API_KEY
    if (chave === undefined) {
      return { ok: false, reason: 'unavailable' }
    }

    const corpo = {
      systemInstruction: { parts: [{ text: request.system }] },
      contents: [{ role: 'user', parts: [{ text: request.user }] }],
      generationConfig: {
        // Determinismo alto de proposito. A leitura interpreta um numero que ja
        // existe, entao criatividade aqui so aumenta a chance de invencao.
        temperature: 0.2,
        maxOutputTokens: request.maxOutputTokens,
        responseMimeType: 'application/json',
      },
    }

    const resposta = await this.chamar(
      `${BASE}/models/${MODELO_TEXTO}:generateContent`,
      chave,
      corpo,
    )
    if (!resposta.ok) {
      return { ok: false, reason: resposta.reason }
    }

    const dados = resposta.dados as RespostaGemini
    const texto = dados.candidates?.[0]?.content?.parts?.[0]?.text
    if (texto === undefined || texto === '') {
      // Resposta vazia costuma ser filtro de seguranca do provedor.
      return { ok: false, reason: 'refused' }
    }
    return { ok: true, text: texto }
  }

  async embed(text: string): Promise<readonly number[] | null> {
    const chave = this.env.GEMINI_API_KEY
    if (chave === undefined) {
      return null
    }

    const resposta = await this.chamar(`${BASE}/models/${MODELO_EMBEDDING}:embedContent`, chave, {
      model: `models/${MODELO_EMBEDDING}`,
      content: { parts: [{ text }] },
    })
    if (!resposta.ok) {
      return null
    }
    return (resposta.dados as RespostaEmbedding).embedding?.values ?? null
  }

  private async chamar(
    url: string,
    chave: string,
    corpo: unknown,
  ): Promise<{ ok: true; dados: unknown } | { ok: false; reason: LlmFailure }> {
    const controlador = new AbortController()
    const relogio = setTimeout(() => {
      controlador.abort()
    }, TIMEOUT_MS)

    try {
      const resposta = await fetch(url, {
        method: 'POST',
        // A chave vai no cabecalho, nunca na URL: URL vaza em log de proxy.
        headers: { 'content-type': 'application/json', 'x-goog-api-key': chave },
        body: JSON.stringify(corpo),
        signal: controlador.signal,
      })

      if (resposta.status === 429) {
        this.logger.warn('Cota do provedor esgotada')
        return { ok: false, reason: 'quota' }
      }
      if (!resposta.ok) {
        // O corpo do erro pode conter o eco da requisicao, entao so o status vai
        // para o log.
        this.logger.warn(`Provedor respondeu ${String(resposta.status)}`)
        return { ok: false, reason: 'error' }
      }

      return { ok: true, dados: await resposta.json() }
    } catch (erro) {
      if (erro instanceof Error && erro.name === 'AbortError') {
        return { ok: false, reason: 'timeout' }
      }
      this.logger.warn('Falha de rede ao falar com o provedor')
      return { ok: false, reason: 'error' }
    } finally {
      clearTimeout(relogio)
    }
  }
}
