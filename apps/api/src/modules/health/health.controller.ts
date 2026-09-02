import { Controller, Get, Inject } from '@nestjs/common'
import { sql } from 'drizzle-orm'

import { ENV } from '../../config/config.module.js'
import type { Env } from '../../config/env.schema.js'
import { DATABASE } from '../../database/database.module.js'
import type { DatabaseHandle } from '../../database/drizzle.client.js'

type EstadoDependencia = 'ok' | 'ausente' | 'falha'

export interface Health {
  readonly status: 'ok' | 'degradado'
  readonly uptimeSeconds: number
  readonly dependencies: {
    readonly database: EstadoDependencia
    readonly model: EstadoDependencia
  }
}

@Controller('health')
export class HealthController {
  constructor(
    @Inject(DATABASE) private readonly handle: DatabaseHandle | null,
    @Inject(ENV) private readonly env: Env,
  ) {}

  /**
   * Diz o que esta de pe, e diferencia ausente de quebrado.
   *
   * `ausente` e uma configuracao, `falha` e um problema. Sem essa distincao, a
   * API sem banco pareceria quebrada, quando na verdade ela simula tudo sem
   * banco: a simulacao e deterministica e nao persiste nada.
   *
   * A rota nunca devolve erro. Um health check que cai junto com a dependencia
   * nao serve para diagnosticar a dependencia.
   */
  @Get()
  async verificar(): Promise<Health> {
    const database = await this.verificarBanco()
    const model: EstadoDependencia = this.env.GEMINI_API_KEY === undefined ? 'ausente' : 'ok'

    return {
      status: database === 'falha' ? 'degradado' : 'ok',
      uptimeSeconds: Math.round(process.uptime()),
      dependencies: { database, model },
    }
  }

  private async verificarBanco(): Promise<EstadoDependencia> {
    if (this.handle === null) {
      return 'ausente'
    }
    try {
      await this.handle.db.execute(sql`select 1`)
      return 'ok'
    } catch {
      return 'falha'
    }
  }
}
