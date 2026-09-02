import { Inject, Injectable } from '@nestjs/common'

import { LLM, type LlmPort } from '../llm/llm.port.js'

/** O embedding gratuito do Gemini devolve 768 dimensoes. */
export const DIMENSOES = 768

/**
 * Vetores de texto.
 *
 * Uma camada fina sobre a porta do modelo, e nao um servico com logica propria.
 * Ela existe para que a ingestao e a recuperacao falem de embedding sem
 * conhecer provedor, e para concentrar a unica regra que existe aqui: vetor com
 * tamanho errado e vetor invalido, e passa a ser nulo.
 */
@Injectable()
export class EmbeddingService {
  constructor(@Inject(LLM) private readonly llm: LlmPort) {}

  async embed(texto: string): Promise<readonly number[] | null> {
    const limpo = texto.trim()
    if (limpo === '') {
      return null
    }

    const vetor = await this.llm.embed(limpo)
    if (vetor?.length !== DIMENSOES) {
      // Tamanho diferente do esperado quebraria o indice no banco, e falhar
      // aqui e mais barato do que descobrir isso no `insert`.
      return null
    }
    return vetor
  }
}
