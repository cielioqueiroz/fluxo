import { drizzle, type PostgresJsDatabase } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'

import * as schema from './schema/index.js'

export type Database = PostgresJsDatabase<typeof schema>

export interface DatabaseHandle {
  readonly db: Database
  readonly close: () => Promise<void>
}

/**
 * Conexao com o Neon.
 *
 * O plano gratuito suspende o banco depois de alguns minutos parado e acorda em
 * menos de um segundo, entao o pool fica pequeno de proposito: manter dez
 * conexoes ociosas contra um banco que dorme so gasta a cota de conexao.
 */
export function createDatabase(url: string): DatabaseHandle {
  const cliente = postgres(url, {
    max: 3,
    idle_timeout: 20,
    connect_timeout: 10,
    // O Neon exige TLS.
    ssl: 'require',
  })

  return {
    db: drizzle(cliente, { schema }),
    close: async () => {
      await cliente.end({ timeout: 5 })
    },
  }
}
