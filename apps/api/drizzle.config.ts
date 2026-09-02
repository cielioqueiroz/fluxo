import { defineConfig } from 'drizzle-kit'

/**
 * Migracoes do Neon.
 *
 * A URL vem do ambiente e nao tem valor de reposicao: gerar migracao contra um
 * banco errado e pior do que nao gerar.
 */
export default defineConfig({
  schema: './src/database/schema/index.ts',
  out: './src/database/migrations',
  dialect: 'postgresql',
  dbCredentials: { url: process.env['DATABASE_URL'] ?? '' },
  strict: true,
  verbose: true,
})
