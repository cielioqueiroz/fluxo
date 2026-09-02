import { sql } from 'drizzle-orm'
import { index, integer, jsonb, pgTable, text, timestamp, vector } from 'drizzle-orm/pg-core'

/**
 * Esquema do banco.
 *
 * A regra 5 da secao 2 do AGENTS.md proibe dado pessoal persistido. Nao existe
 * tabela de usuario, nao existe sessao, e nenhuma coluna guarda CPF, e-mail ou
 * nome. O que vai ao banco e cache de texto gerado e corpus publico, e nada
 * mais.
 */

/**
 * Cache de insight.
 *
 * A chave e o hash dos parametros da simulacao mais o hash do prompt, conforme
 * a secao 6 do AGENTS.md. Cenario repetido nao gasta cota. A linha guarda o
 * resumo que entrou, para auditoria, e o resumo e agregado: nao da para
 * reconstruir quem simulou.
 */
export const insightCache = pgTable(
  'insight_cache',
  {
    /** sha256 de (parametros + prompt). */
    key: text('key').primaryKey(),
    promptVersion: text('prompt_version').notNull(),
    promptHash: text('prompt_hash').notNull(),
    /** A entrada agregada que o modelo recebeu. */
    input: jsonb('input').notNull(),
    /** A saida ja validada pelo schema de contracts. */
    output: jsonb('output').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    hits: integer('hits').notNull().default(0),
  },
  (tabela) => [index('insight_cache_prompt_idx').on(tabela.promptVersion)],
)

/**
 * Corpus publico de educacao financeira, em pedacos.
 *
 * Cada pedaco carrega fonte e URL, porque a secao 6 exige citacao obrigatoria e
 * afirmacao sem chunk correspondente e removida antes de chegar a UI. Sem a URL
 * na linha, a citacao teria de ser inventada, que e exatamente o que a regra 3
 * proibe.
 */
export const corpusChunk = pgTable(
  'corpus_chunk',
  {
    id: text('id').primaryKey(),
    source: text('source').notNull(),
    url: text('url').notNull(),
    /** De que documento o pedaco veio, para agrupar na citacao. */
    documentId: text('document_id').notNull(),
    position: integer('position').notNull(),
    content: text('content').notNull(),
    /** 768 dimensoes: e o tamanho do embedding gratuito do Gemini. */
    embedding: vector('embedding', { dimensions: 768 }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (tabela) => [
    // HNSW com distancia de cosseno. Indice aproximado porque busca exata em
    // corpus crescente custa varredura completa, e a recuperacao aqui nao
    // precisa ser exata, precisa ser relevante.
    index('corpus_chunk_embedding_idx')
      .using('hnsw', sql`${tabela.embedding} vector_cosine_ops`)
      .where(sql`${tabela.embedding} is not null`),
    index('corpus_chunk_document_idx').on(tabela.documentId),
  ],
)

export type InsightCacheRow = typeof insightCache.$inferSelect
export type CorpusChunkRow = typeof corpusChunk.$inferSelect
