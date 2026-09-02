import {
  insightModelOutputSchema,
  type InsightInput,
  type InsightModelOutput,
  type InsightResponse,
} from '@fluxo/contracts'
import { Inject, Injectable, Logger } from '@nestjs/common'

import { LLM, type LlmPort } from '../llm/llm.port.js'
import { RagService, type RetrievedChunk } from '../rag/rag.service.js'
import { InsightCache } from './insight.cache.js'
import {
  PROMPT_HASH,
  PROMPT_VERSION,
  SYSTEM_PROMPT,
  renderInsightPrompt,
} from './prompts/registry.js'

/** O aviso e do servidor, nunca do modelo. Texto fixo, sempre igual. */
const AVISO =
  'Material educativo. Nao e recomendacao de produto financeiro. Os valores sao uma simulacao e podem diferir do contrato do seu banco. A comparacao e nominal, sem correcao pelo valor do dinheiro no tempo.'

const MAX_OUTPUT_TOKENS = 900

@Injectable()
export class InsightService {
  private readonly logger = new Logger(InsightService.name)

  constructor(
    @Inject(LLM) private readonly llm: LlmPort,
    private readonly cache: InsightCache,
    private readonly rag: RagService,
  ) {}

  /**
   * Escreve a leitura de um cenario.
   *
   * Nunca lanca e nunca devolve nulo. Quando o modelo falha, falta chave, ou a
   * saida nao passa no schema depois de uma segunda tentativa, a resposta volta
   * marcada como `degraded`, e o front mostra o resumo deterministico que ja
   * existe desde a Fase 3. A pagina nunca quebra por causa do modelo.
   */
  async read(resumo: InsightInput): Promise<InsightResponse> {
    const chave = this.cache.key(resumo)

    const guardado = await this.cache.get(chave)
    if (guardado !== null) {
      return this.montar(guardado, false)
    }

    if (!this.llm.isAvailable()) {
      return this.degradado()
    }

    const trechos = await this.rag.retrieve(resumo)
    const saida = await this.gerarComUmaTentativaDeCorrecao(resumo, trechos)
    if (saida === null) {
      return this.degradado()
    }

    // Afirmacao sem chunk correspondente e removida antes de chegar a UI.
    const limpa = this.rag.dropUngroundedClaims(saida, trechos)

    await this.cache.set(chave, resumo, limpa)
    return this.montar(limpa, false)
  }

  /**
   * Uma geracao, e no maximo uma correcao.
   *
   * A segunda tentativa recebe o erro do schema como instrucao, e nao apenas o
   * mesmo pedido de novo: repetir identico tende a repetir a falha. No segundo
   * erro, desiste, porque a terceira chamada gastaria cota para atrasar a
   * mesma degradacao.
   */
  private async gerarComUmaTentativaDeCorrecao(
    resumo: InsightInput,
    trechos: readonly RetrievedChunk[],
  ): Promise<InsightModelOutput | null> {
    const fontes = this.rag.format(trechos)
    const pedido = renderInsightPrompt(resumo, fontes)

    const primeira = await this.llm.generate({
      system: SYSTEM_PROMPT.content,
      user: pedido,
      maxOutputTokens: MAX_OUTPUT_TOKENS,
    })
    if (!primeira.ok) {
      this.logger.warn(`Modelo indisponivel: ${primeira.reason}`)
      return null
    }

    const lida = this.interpretar(primeira.text)
    if (lida.ok) {
      return lida.valor
    }

    this.logger.warn('Saida do modelo fora do schema, tentando corrigir uma vez')
    const segunda = await this.llm.generate({
      system: SYSTEM_PROMPT.content,
      user: `${pedido}\n\n## Correcao\n\nSua resposta anterior foi recusada pelo schema com estes problemas:\n\n${lida.problemas}\n\nDevolva o JSON corrigido, e apenas ele.`,
      maxOutputTokens: MAX_OUTPUT_TOKENS,
    })
    if (!segunda.ok) {
      return null
    }

    const relida = this.interpretar(segunda.text)
    if (!relida.ok) {
      this.logger.warn('Segunda saida tambem fora do schema, degradando')
      return null
    }
    return relida.valor
  }

  private interpretar(
    texto: string,
  ): { ok: true; valor: InsightModelOutput } | { ok: false; problemas: string } {
    let cru: unknown
    try {
      // Alguns modelos devolvem o JSON dentro de cerca de codigo mesmo quando
      // instruidos a nao fazer isso. Tirar a cerca e mais barato que degradar.
      cru = JSON.parse(texto.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/, ''))
    } catch {
      return { ok: false, problemas: 'A resposta nao era JSON valido.' }
    }

    const conferido = insightModelOutputSchema.safeParse(cru)
    if (!conferido.success) {
      return {
        ok: false,
        problemas: conferido.error.issues
          .map((problema) => `- ${problema.path.join('.')}: ${problema.message}`)
          .join('\n'),
      }
    }
    return { ok: true, valor: conferido.data }
  }

  private montar(saida: InsightModelOutput, degraded: boolean): InsightResponse {
    return {
      ...saida,
      disclaimer: AVISO,
      promptVersion: PROMPT_VERSION,
      promptHash: PROMPT_HASH,
      degraded,
    }
  }

  /**
   * A resposta degradada.
   *
   * Texto vazio de proposito: o front ja tem o resumo deterministico da Fase 3 e
   * vai mostra-lo. Inventar aqui uma frase de consolo seria o servidor gerando
   * conteudo que ninguem pediu.
   */
  private degradado(): InsightResponse {
    return this.montar({ headline: '', reading: '', claims: [], citations: [] }, true)
  }
}
