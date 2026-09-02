import { describe, expect, it } from 'vitest'

import { HealthController } from '../src/modules/health/health.controller.js'
import { loadEnv } from '../src/config/env.schema.js'
import type { DatabaseHandle } from '../src/database/drizzle.client.js'

const bancoQueResponde = {
  db: { execute: () => Promise.resolve([]) },
  close: () => Promise.resolve(),
} as unknown as DatabaseHandle

const bancoQuebrado = {
  db: {
    execute: () => Promise.reject(new Error('conexao recusada')),
  },
  close: () => Promise.resolve(),
} as unknown as DatabaseHandle

const semChave = loadEnv({})
const comChave = loadEnv({ GEMINI_API_KEY: 'chave-de-teste' })

describe('GET /health', () => {
  it('sem banco configurado, reporta ausente e continua ok', async () => {
    const saude = await new HealthController(null, semChave).verificar()
    expect(saude.dependencies.database).toBe('ausente')
    expect(saude.status).toBe('ok')
  })

  it('separa ausente de quebrado, porque um e configuracao e o outro e problema', async () => {
    const quebrado = await new HealthController(bancoQuebrado, semChave).verificar()
    expect(quebrado.dependencies.database).toBe('falha')
    expect(quebrado.status).toBe('degradado')
  })

  it('com banco respondendo, fica ok', async () => {
    const saude = await new HealthController(bancoQueResponde, semChave).verificar()
    expect(saude.dependencies.database).toBe('ok')
    expect(saude.status).toBe('ok')
  })

  it('reporta a chave do modelo sem nunca revelar o valor', async () => {
    const saude = await new HealthController(null, comChave).verificar()
    expect(saude.dependencies.model).toBe('ok')
    expect(JSON.stringify(saude)).not.toContain('chave-de-teste')
  })

  it('nunca lanca, mesmo com o banco fora, porque health check que cai nao diagnostica nada', async () => {
    await expect(new HealthController(bancoQuebrado, semChave).verificar()).resolves.toBeDefined()
  })

  it('traz o tempo de vida do processo', async () => {
    const saude = await new HealthController(null, semChave).verificar()
    expect(saude.uptimeSeconds).toBeGreaterThanOrEqual(0)
  })
})
