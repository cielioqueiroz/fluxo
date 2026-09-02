import { simulationResultSchema } from '@fluxo/contracts'
import { Test } from '@nestjs/testing'
import { FastifyAdapter, type NestFastifyApplication } from '@nestjs/platform-fastify'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { HttpExceptionFilter } from '../src/common/filters/http-exception.filter.js'
import { RequestIdInterceptor } from '../src/common/interceptors/request-id.interceptor.js'
import { SimulationModule } from '../src/modules/simulation/simulation.module.js'

/**
 * Teste de contrato da rota de simulacao.
 *
 * Sobe a aplicacao de verdade, com o adapter Fastify de verdade, e verifica o
 * que atravessa o HTTP. Nao usa banco nem chave de modelo, porque a simulacao
 * nao precisa de nenhum dos dois.
 */
let app: NestFastifyApplication

const emprestimo = {
  kind: 'loan',
  principal: 3000000,
  monthlyRate: 0.0179,
  termMonths: 48,
  system: 'price',
  monthlyExtra: 20000,
} as const

const cartao = {
  kind: 'card',
  invoice: 250000,
  revolvingRate: 0.14,
  installmentRate: 0.07,
  installmentTermMonths: 12,
  policy: { kind: 'minimum' },
  preset: 'brasil',
} as const

beforeAll(async () => {
  const modulo = await Test.createTestingModule({ imports: [SimulationModule] }).compile()
  app = modulo.createNestApplication<NestFastifyApplication>(new FastifyAdapter())
  app.useGlobalFilters(new HttpExceptionFilter())
  app.useGlobalInterceptors(new RequestIdInterceptor())
  await app.init()
  await app.getHttpAdapter().getInstance().ready()
})

afterAll(async () => {
  await app.close()
})

const post = async (corpo: Record<string, unknown>) =>
  app.inject({ method: 'POST', url: '/simulation', payload: corpo })

describe('POST /simulation, emprestimo', () => {
  it('devolve uma tabela que quita', async () => {
    const resposta = await post(emprestimo)
    expect(resposta.statusCode).toBe(201)
    const corpo = resposta.json<{ result: { schedule: { settled: boolean } } }>()
    expect(corpo.result.schedule.settled).toBe(true)
  })

  it('a saida bate com o schema de contracts, campo por campo', async () => {
    const resposta = await post(emprestimo)
    const corpo = resposta.json<{ result: unknown }>()
    const conferido = simulationResultSchema.safeParse(corpo.result)
    expect(conferido.success, JSON.stringify(conferido.error?.issues)).toBe(true)
  })

  it('traz a comparacao com a economia do aporte', async () => {
    const resposta = await post(emprestimo)
    const corpo = resposta.json<{
      result: { comparison: { prepay: { savedVersusKeep: number } } | null }
    }>()
    expect(corpo.result.comparison?.prepay.savedVersusKeep).toBeGreaterThan(0)
  })

  it('traz o resumo pronto para a Fase 6, com os tres marcos', async () => {
    const resposta = await post(emprestimo)
    const corpo = resposta.json<{ summary: { milestones: unknown[]; kind: string } }>()
    expect(corpo.summary.kind).toBe('loan')
    expect(corpo.summary.milestones).toHaveLength(3)
  })

  it('aceita SAC', async () => {
    const resposta = await post({ ...emprestimo, system: 'sac' })
    expect(resposta.statusCode).toBe(201)
  })
})

describe('POST /simulation, cartao', () => {
  it('devolve os dois estagios e os metadados do cartao', async () => {
    const resposta = await post(cartao)
    expect(resposta.statusCode).toBe(201)
    const corpo = resposta.json<{
      result: {
        schedule: { installments: { stage: string }[] }
        card: { revolvingEndedAtPeriod: number | null } | null
      }
    }>()
    expect(corpo.result.schedule.installments[0]?.stage).toBe('revolving')
    expect(corpo.result.schedule.installments[1]?.stage).toBe('installment')
    expect(corpo.result.card?.revolvingEndedAtPeriod).toBe(1)
  })

  it('nao traz comparacao, porque cartao nao tem antecipacao nesta fase', async () => {
    const resposta = await post(cartao)
    expect(resposta.json<{ result: { comparison: unknown } }>().result.comparison).toBeNull()
  })
})

describe('POST /simulation, entrada invalida', () => {
  it('recusa principal negativo, com a lista de problemas', async () => {
    const resposta = await post({ ...emprestimo, principal: -1 })
    expect(resposta.statusCode).toBe(400)
    const corpo = resposta.json<{ issues: { path: string }[] }>()
    expect(corpo.issues.some((problema) => problema.path.includes('principal'))).toBe(true)
  })

  it('recusa corpo vazio', async () => {
    expect((await post({})).statusCode).toBe(400)
  })

  it('recusa tipo de divida desconhecido', async () => {
    expect((await post({ ...emprestimo, kind: 'consorcio' })).statusCode).toBe(400)
  })

  it('o cliente nao dita regulacao: params injetado e recusado', async () => {
    const ataque = { ...cartao, params: { totalChargeCap: null, revolvingCycleLimit: 999 } }
    expect((await post(ataque)).statusCode).toBe(400)
  })

  it('recusa taxa em percentual, que quase sempre e erro de fator cem', async () => {
    expect((await post({ ...emprestimo, monthlyRate: 1.79 })).statusCode).toBe(400)
  })
})

describe('rastro da requisicao', () => {
  it('toda resposta volta com x-request-id', async () => {
    const resposta = await post(emprestimo)
    expect(resposta.headers['x-request-id']).toBeTruthy()
  })

  it('respeita o identificador que o cliente mandou', async () => {
    const resposta = await app.inject({
      method: 'POST',
      url: '/simulation',
      payload: emprestimo,
      headers: { 'x-request-id': 'rastro-de-teste' },
    })
    expect(resposta.headers['x-request-id']).toBe('rastro-de-teste')
  })

  it('o corpo de erro carrega o identificador, para amarrar tela e log', async () => {
    const resposta = await post({ ...emprestimo, principal: -1 })
    expect(resposta.json<{ requestId: string }>().requestId).toBeTruthy()
  })
})
