import { createHash } from 'node:crypto'

import type { InsightInput, InsightModelOutput } from '@fluxo/contracts'
import { Inject, Injectable, Logger } from '@nestjs/common'
import { eq, sql } from 'drizzle-orm'

import { DATABASE } from '../../database/database.module.js'
import type { DatabaseHandle } from '../../database/drizzle.client.js'
import { insightCache } from '../../database/schema/index.js'
import { PROMPT_HASH, PROMPT_VERSION } from './prompts/registry.js'

/**
 * Cache de insight por hash.
 *
 * A chave e o hash dos parametros da simulacao mais o hash do prompt, como manda
 * a secao 6 do AGENTS.md. Cenario repetido nao gera chamada nova, e e isso que
 * mantem o projeto dentro da cota gratuita.
 *
 * Funciona sem banco. Sem `DATABASE_URL` o cache vira uma camada que sempre erra
 * a leitura e nunca escreve, o que e exatamente o comportamento correto: pior
 * desempenho, mesmo resultado.
 */
@Injectable()
export class InsightCache {
  private readonly logger = new Logger(InsightCache.name)

  constructor(@Inject(DATABASE) private readonly handle: DatabaseHandle | null) {}

  /**
   * Chave estavel para um cenario.
   *
   * As chaves do resumo sao ordenadas antes de serializar, porque a ordem das
   * propriedades em JSON nao e garantida e dois objetos iguais com ordem
   * diferente produziriam chaves diferentes, o que faria o cache errar sempre.
   */
  key(resumo: InsightInput): string {
    const estavel = JSON.stringify(resumo, Object.keys(resumo).sort())
    return createHash('sha256').update(estavel).update(PROMPT_HASH).digest('hex')
  }

  async get(chave: string): Promise<InsightModelOutput | null> {
    if (this.handle === null) {
      return null
    }
    try {
      const linhas = await this.handle.db
        .select({ output: insightCache.output })
        .from(insightCache)
        .where(eq(insightCache.key, chave))
        .limit(1)

      const encontrada = linhas[0]
      if (encontrada === undefined) {
        return null
      }

      // Conta o acerto sem segurar a resposta. Se falhar, o usuario nao perde
      // nada: e uma metrica, nao o produto.
      void this.handle.db
        .update(insightCache)
        .set({ hits: sql`${insightCache.hits} + 1` })
        .where(eq(insightCache.key, chave))
        .catch(() => undefined)

      return encontrada.output as InsightModelOutput
    } catch {
      // Banco fora do ar nao pode derrubar a leitura. Perde o cache, segue.
      this.logger.warn('Leitura de cache falhou, seguindo sem ele')
      return null
    }
  }

  async set(chave: string, entrada: InsightInput, saida: InsightModelOutput): Promise<void> {
    if (this.handle === null) {
      return
    }
    try {
      await this.handle.db
        .insert(insightCache)
        .values({
          key: chave,
          promptVersion: PROMPT_VERSION,
          promptHash: PROMPT_HASH,
          input: entrada,
          output: saida,
        })
        .onConflictDoNothing()
    } catch {
      this.logger.warn('Escrita de cache falhou, seguindo sem ela')
    }
  }
}
