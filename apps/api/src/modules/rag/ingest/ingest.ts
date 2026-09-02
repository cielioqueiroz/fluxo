import { sql } from 'drizzle-orm'

import { loadEnv } from '../../../config/env.schema.js'
import { createDatabase } from '../../../database/drizzle.client.js'
import { corpusChunk } from '../../../database/schema/index.js'
import { GeminiAdapter } from '../../llm/gemini.adapter.js'
import { chunkDocument } from '../chunking.js'
import { DIMENSOES } from '../embedding.service.js'
import { CORPUS } from './corpus.js'

/**
 * Ingestao do corpus publico.
 *
 * Roda uma vez, fora de requisicao, e nunca durante o atendimento. A cota
 * gratuita de embedding e limitada por minuto, entao a ingestao vai devagar de
 * proposito e retoma de onde parou: um pedaco que ja tem embedding e pulado, e
 * rodar duas vezes nao gasta cota duas vezes.
 *
 * Uso:
 *
 *   DATABASE_URL=... GEMINI_API_KEY=... node dist/modules/rag/ingest/ingest.js
 */

/** Espaco entre chamadas, para nao estourar o limite por minuto. */
const PAUSA_MS = 1_200

async function esperar(ms: number): Promise<void> {
  await new Promise((resolver) => setTimeout(resolver, ms))
}

async function main(): Promise<void> {
  const env = loadEnv()

  if (env.DATABASE_URL === undefined) {
    console.error('DATABASE_URL e obrigatoria para ingerir o corpus.')
    process.exit(1)
  }
  if (env.GEMINI_API_KEY === undefined) {
    console.error('GEMINI_API_KEY e obrigatoria para gerar os embeddings.')
    process.exit(1)
  }

  const { db, close } = createDatabase(env.DATABASE_URL)
  const modelo = new GeminiAdapter(env)

  try {
    await db.execute(sql`create extension if not exists vector`)

    const pedacos = CORPUS.flatMap((documento) => chunkDocument(documento))
    console.warn(
      `Corpus com ${String(CORPUS.length)} documentos, ${String(pedacos.length)} pedacos`,
    )

    const existentes = await db.select({ id: corpusChunk.id }).from(corpusChunk)
    const jaTem = new Set(existentes.map((linha) => linha.id))

    let inseridos = 0
    let pulados = 0

    for (const pedaco of pedacos) {
      if (jaTem.has(pedaco.id)) {
        pulados += 1
        continue
      }

      const vetor = await modelo.embed(pedaco.content)
      if (vetor?.length !== DIMENSOES) {
        console.error(`Embedding falhou para ${pedaco.id}, parando para nao gravar pela metade.`)
        process.exit(1)
      }

      await db
        .insert(corpusChunk)
        .values({
          id: pedaco.id,
          source: pedaco.source,
          url: pedaco.url,
          documentId: pedaco.documentId,
          position: pedaco.position,
          content: pedaco.content,
          embedding: [...vetor],
        })
        .onConflictDoNothing()

      inseridos += 1
      console.warn(`  ${pedaco.id}`)
      await esperar(PAUSA_MS)
    }

    console.warn(`Pronto. ${String(inseridos)} inseridos, ${String(pulados)} ja existiam.`)
  } finally {
    await close()
  }
}

main().catch((erro: unknown) => {
  console.error(erro instanceof Error ? erro.message : String(erro))
  process.exit(1)
})
