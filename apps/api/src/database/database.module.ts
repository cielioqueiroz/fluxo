import { Global, Inject, Module, type OnApplicationShutdown } from '@nestjs/common'

import { ENV } from '../config/config.module.js'
import type { Env } from '../config/env.schema.js'
import { createDatabase, type DatabaseHandle } from './drizzle.client.js'

export const DATABASE = Symbol('fluxo:database')

/**
 * O banco e opcional, e o tipo diz isso.
 *
 * Sem `DATABASE_URL` o provedor entrega `null`. Quem depende do banco precisa
 * tratar a ausencia, e nao pode presumir conexao. E o que permite a API subir e
 * simular no Render sem nenhum banco provisionado.
 */
@Global()
@Module({
  providers: [
    {
      provide: DATABASE,
      inject: [ENV],
      useFactory: (env: Env): DatabaseHandle | null =>
        env.DATABASE_URL === undefined ? null : createDatabase(env.DATABASE_URL),
    },
  ],
  exports: [DATABASE],
})
export class DatabaseModule implements OnApplicationShutdown {
  constructor(@Inject(DATABASE) private readonly handle: DatabaseHandle | null) {}

  async onApplicationShutdown(): Promise<void> {
    await this.handle?.close()
  }
}
