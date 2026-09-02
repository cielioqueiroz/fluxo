import 'reflect-metadata'

import { Logger } from '@nestjs/common'
import { NestFactory } from '@nestjs/core'
import { FastifyAdapter, type NestFastifyApplication } from '@nestjs/platform-fastify'

import { AppModule } from './app.module.js'
import { ENV } from './config/config.module.js'
import type { Env } from './config/env.schema.js'

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter({ trustProxy: true }),
    { bufferLogs: true },
  )

  const env = app.get<Env>(ENV)

  app.enableCors({
    origin: env.CORS_ORIGINS,
    methods: ['GET', 'POST'],
    // Nao ha cookie nem sessao: o usuario nao cria conta. Sem credenciais, o
    // CORS fica estritamente na lista de origens.
    credentials: false,
  })

  /*
   * Desligamento gracioso.
   *
   * O plano gratuito do Render derruba a instancia por inatividade e a recria
   * quando alguem chama. Sem os hooks, a conexao com o Neon fica pendurada a
   * cada ciclo e a cota de conexao do plano gratuito acaba.
   */
  app.enableShutdownHooks()

  // `0.0.0.0` porque no Render o processo precisa aceitar de fora do container.
  await app.listen({ port: env.PORT, host: '0.0.0.0' })
  Logger.log(`Fluxo API em http://0.0.0.0:${String(env.PORT)}`, 'bootstrap')
}

bootstrap().catch((erro: unknown) => {
  // Ambiente invalido cai aqui, com a lista do que falta. Falhar em um segundo
  // e melhor do que falhar na primeira requisicao que tocar a variavel errada.
  Logger.error(erro instanceof Error ? erro.message : String(erro), 'bootstrap')
  process.exit(1)
})
