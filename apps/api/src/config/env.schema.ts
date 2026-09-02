import { z } from 'zod'

/**
 * Toda variavel de ambiente passa por aqui antes de ser usada.
 *
 * A regra 7 da secao 2 do AGENTS.md exige Zod em toda borda, e ambiente e
 * borda. A aplicacao nao sobe com ambiente invalido: e melhor falhar no
 * primeiro segundo, com a lista do que falta, do que falhar na primeira
 * requisicao que tocar a variavel errada.
 */
export const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().min(1).max(65535).default(3333),

  /** Origens que podem chamar a API. Lista separada por virgula. */
  CORS_ORIGINS: z
    .string()
    .default('http://localhost:3000')
    .transform((valor) =>
      valor
        .split(',')
        .map((origem) => origem.trim())
        .filter((origem) => origem !== ''),
    ),

  /**
   * Conexao com o Neon. Opcional de proposito.
   *
   * A simulacao e deterministica e nao precisa de banco. Sem `DATABASE_URL` a
   * API sobe, calcula e responde, e apenas o health check reporta o banco como
   * ausente. O banco so e obrigatorio para o cache de insight e para o RAG, que
   * sao da Fase 6.
   */
  DATABASE_URL: z.url().startsWith('postgres').optional(),

  /**
   * Chave do provedor de modelo. Nunca chega ao cliente.
   *
   * Ausente, o modulo de insight responde com o resumo deterministico e marca a
   * resposta como degradada. A pagina nao quebra por falta de chave.
   */
  GEMINI_API_KEY: z.string().min(1).optional(),

  /** Janela e teto do rate limit, por endereco. */
  RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(60_000),
  RATE_LIMIT_MAX: z.coerce.number().int().positive().default(60),
})

export type Env = z.infer<typeof envSchema>

/**
 * Le e valida o ambiente.
 *
 * Lanca com a lista completa do que esta errado, e nao apenas com o primeiro
 * problema, para quem esta subindo o servico corrigir tudo de uma vez.
 */
export function loadEnv(fonte: NodeJS.ProcessEnv = process.env): Env {
  const resultado = envSchema.safeParse(fonte)
  if (!resultado.success) {
    const problemas = resultado.error.issues
      .map((problema) => `  ${problema.path.join('.')}: ${problema.message}`)
      .join('\n')
    throw new Error(`Ambiente invalido:\n${problemas}`)
  }
  return resultado.data
}
