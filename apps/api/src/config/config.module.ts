import { Global, Module } from '@nestjs/common'

import { loadEnv, type Env } from './env.schema.js'

export const ENV = Symbol('fluxo:env')

/**
 * Ambiente validado, disponivel por injecao.
 *
 * Global porque quase todo modulo precisa de alguma variavel, e repetir o
 * import em cada um so acrescentaria ruido. O valor e lido uma vez, na
 * inicializacao, e nao muda depois.
 */
@Global()
@Module({
  providers: [
    {
      provide: ENV,
      useFactory: (): Env => loadEnv(),
    },
  ],
  exports: [ENV],
})
export class ConfigModule {}
