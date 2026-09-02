import { insightResponseSchema } from '@fluxo/contracts'
import { Test } from '@nestjs/testing'
import { FastifyAdapter, type NestFastifyApplication } from '@nestjs/platform-fastify'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { HttpExceptionFilter } from '../src/common/filters/http-exception.filter.js'
import { ConfigModule, ENV } from '../src/config/config.module.js'
import { loadEnv } from '../src/config/env.schema.js'
import { DatabaseModule, DATABASE } from '../src/database/database.module.js'
import { InsightModule } from '../src/modules/insight/insight.module.js'
import { LlmModule } from '../src/modules/llm/llm.module.js'
import { LLM } from '../src/modules/llm/llm.port.js'
import { EmbeddingService } from '../src/modules/rag/embedding.service.js'
import type { LlmPort } from '../src/modules/llm/llm.port.js'

/**
 * Teste de contrato da rota de insight.
 *
 * Sobe o modulo inteiro sem banco e sem chave, que e o cenario de producao mais
 * provavel no plano gratuito. A rota precisa responder mesmo assim.
 */
let app: NestFastifyApplication

const resumo = {
  kind: 'loan',
  principal: 3000000,
  totalPaid: 4496330,
  totalInterest: 1496330,
  totalFees: 0,
  interestOverPrincipalPercent: 49.9,
  termMonths: 48,
  settled: true,
  neverSettles: false,
  capReachedAtPeriod: null,
  milestones: [{ fraction: 0.5, period: 29, balance: 1497513 }],
}

const semModelo: LlmPort = {
  isAvailable: () => false,
  embed: () => Promise.resolve(null),
  generate: () => Promise.resolve({ ok: false, reason: 'unavailable' }),
}

beforeAll(async () => {
  const modulo = await Test.createTestingModule({
    imports: [ConfigModule, DatabaseModule, LlmModule, InsightModule],
  })
    .overrideProvider(LLM)
    .useValue(semModelo)
    .overrideProvider(DATABASE)
    .useValue(null)
    .overrideProvider(ENV)
    .useValue(loadEnv({}))
    .compile()

  app = modulo.createNestApplication<NestFastifyApplication>(new FastifyAdapter())
  app.useGlobalFilters(new HttpExceptionFilter())
  await app.init()
  await app.getHttpAdapter().getInstance().ready()
})

afterAll(async () => {
  await app?.close()
})

const post = async (corpo: Record<string, unknown>) =>
  app.inject({ method: 'POST', url: '/insight', payload: corpo })

describe('POST /insight', () => {
  it('responde 201 mesmo sem chave de modelo, com a resposta degradada', async () => {
    const resposta = await post(resumo)
    expect(resposta.statusCode).toBe(201)
    expect(resposta.json<{ degraded: boolean }>().degraded).toBe(true)
  })

  it('a resposta degradada continua valida pelo schema de contracts', async () => {
    const conferida = insightResponseSchema.safeParse((await post(resumo)).json())
    expect(conferida.success, JSON.stringify(conferida.error?.issues)).toBe(true)
  })

  it('recusa o array de parcelas, que nunca deve chegar ao modelo', async () => {
    const vazando = { ...resumo, installments: [{ period: 1, payment: 100 }] }
    expect((await post(vazando)).statusCode).toBe(400)
  })

  it('recusa mais de tres marcos, porque o orcamento de contexto e fixo', async () => {
    const demais = {
      ...resumo,
      milestones: [
        { fraction: 0.25, period: 7, balance: 1 },
        { fraction: 0.5, period: 8, balance: 1 },
        { fraction: 0.75, period: 9, balance: 1 },
        { fraction: 0.75, period: 10, balance: 1 },
      ],
    }
    expect((await post(demais)).statusCode).toBe(400)
  })

  it('recusa corpo vazio', async () => {
    expect((await post({})).statusCode).toBe(400)
  })
})

describe('EmbeddingService', () => {
  const comVetor = (valores: readonly number[] | null): LlmPort => ({
    isAvailable: () => true,
    embed: () => Promise.resolve(valores),
    generate: () => Promise.resolve({ ok: false, reason: 'error' }),
  })

  it('devolve o vetor quando ele tem o tamanho esperado', async () => {
    const vetor = Array.from({ length: 768 }, () => 0.1)
    expect(await new EmbeddingService(comVetor(vetor)).embed('texto')).toHaveLength(768)
  })

  it('recusa vetor de tamanho errado, que quebraria o indice no banco', async () => {
    expect(await new EmbeddingService(comVetor([0.1, 0.2])).embed('texto')).toBeNull()
  })

  it('texto vazio nao gasta chamada', async () => {
    const nunca: LlmPort = {
      isAvailable: () => true,
      embed: () => {
        throw new Error('nao deveria ter sido chamado')
      },
      generate: () => Promise.resolve({ ok: false, reason: 'error' }),
    }
    expect(await new EmbeddingService(nunca).embed('   ')).toBeNull()
  })

  it('provedor sem embedding devolve nulo, e nao lanca', async () => {
    expect(await new EmbeddingService(comVetor(null)).embed('texto')).toBeNull()
  })
})
