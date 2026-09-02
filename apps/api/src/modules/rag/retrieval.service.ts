import { Inject, Injectable, Logger } from '@nestjs/common'
import { cosineDistance, isNotNull, sql } from 'drizzle-orm'

import { DATABASE } from '../../database/database.module.js'
import type { DatabaseHandle } from '../../database/drizzle.client.js'
import { corpusChunk } from '../../database/schema/index.js'
import { EmbeddingService } from './embedding.service.js'

export interface RetrievedChunk {
  readonly id: string
  readonly source: string
  readonly url: string
  readonly content: string
  /** Zero a um. Um e identico. */
  readonly similarity: number
}

/** Quantos candidatos buscar antes do reordenamento. */
const CANDIDATOS = 12

/**
 * Abaixo disso o trecho nao tem relacao com a pergunta.
 *
 * Corte proposital: e melhor o agente escrever sem citacao, e a UI mostrar so os
 * numeros, do que ele citar um trecho que nao sustenta o que ele disse.
 */
const SIMILARIDADE_MINIMA = 0.35

@Injectable()
export class RetrievalService {
  private readonly logger = new Logger(RetrievalService.name)

  constructor(
    @Inject(DATABASE) private readonly handle: DatabaseHandle | null,
    private readonly embedding: EmbeddingService,
  ) {}

  /**
   * Busca trechos parecidos com a consulta.
   *
   * Devolve lista vazia quando nao ha banco, quando nao ha embedding, ou quando
   * nada passa do corte. Lista vazia e um resultado valido: o prompt manda o
   * agente escrever so a leitura dos numeros quando nao recebe fonte.
   */
  async search(consulta: string): Promise<readonly RetrievedChunk[]> {
    if (this.handle === null) {
      return []
    }

    const vetor = await this.embedding.embed(consulta)
    if (vetor === null) {
      return []
    }

    try {
      const similaridade = sql<number>`1 - (${cosineDistance(corpusChunk.embedding, [...vetor])})`

      const linhas = await this.handle.db
        .select({
          id: corpusChunk.id,
          source: corpusChunk.source,
          url: corpusChunk.url,
          content: corpusChunk.content,
          similarity: similaridade,
        })
        .from(corpusChunk)
        .where(isNotNull(corpusChunk.embedding))
        .orderBy(sql`${similaridade} desc`)
        .limit(CANDIDATOS)

      return linhas.filter((linha) => linha.similarity >= SIMILARIDADE_MINIMA)
    } catch {
      // Banco fora do ar tira as citacoes, nao a leitura.
      this.logger.warn('Busca no corpus falhou, seguindo sem citacao')
      return []
    }
  }
}
