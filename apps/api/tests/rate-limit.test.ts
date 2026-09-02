import { HttpException, type ExecutionContext } from '@nestjs/common'
import { describe, expect, it } from 'vitest'

import { RateLimitGuard } from '../src/common/guards/rate-limit.guard.js'
import { loadEnv } from '../src/config/env.schema.js'

const contextoCom = (ip: string, encaminhado?: string): ExecutionContext =>
  ({
    switchToHttp: () => ({
      getRequest: () => ({
        ip,
        headers: encaminhado === undefined ? {} : { 'x-forwarded-for': encaminhado },
      }),
    }),
  }) as unknown as ExecutionContext

const env = loadEnv({ RATE_LIMIT_MAX: '3', RATE_LIMIT_WINDOW_MS: '1000' })

describe('RateLimitGuard', () => {
  it('deixa passar ate o teto', () => {
    const guarda = new RateLimitGuard(env)
    const contexto = contextoCom('10.0.0.1')
    for (let i = 0; i < 3; i += 1) {
      expect(guarda.canActivate(contexto)).toBe(true)
    }
  })

  it('barra depois do teto, com 429 e o tempo de espera', () => {
    const guarda = new RateLimitGuard(env)
    const contexto = contextoCom('10.0.0.2')
    for (let i = 0; i < 3; i += 1) {
      guarda.canActivate(contexto)
    }
    try {
      guarda.canActivate(contexto)
      expect.unreachable('deveria ter barrado')
    } catch (erro) {
      expect(erro).toBeInstanceOf(HttpException)
      expect((erro as HttpException).getStatus()).toBe(429)
    }
  })

  it('conta por endereco, e nao no total', () => {
    const guarda = new RateLimitGuard(env)
    for (let i = 0; i < 3; i += 1) {
      guarda.canActivate(contextoCom('10.0.0.3'))
    }
    // Outro endereco comeca do zero.
    expect(guarda.canActivate(contextoCom('10.0.0.4'))).toBe(true)
  })

  it('usa x-forwarded-for, porque no Render a API fica atras de proxy', () => {
    const guarda = new RateLimitGuard(env)
    // Mesmo IP de socket, clientes diferentes segundo o proxy.
    for (let i = 0; i < 3; i += 1) {
      guarda.canActivate(contextoCom('172.16.0.1', '203.0.113.7'))
    }
    expect(guarda.canActivate(contextoCom('172.16.0.1', '203.0.113.8'))).toBe(true)
  })

  it('pega o primeiro endereco da cadeia de proxies', () => {
    const guarda = new RateLimitGuard(env)
    for (let i = 0; i < 3; i += 1) {
      guarda.canActivate(contextoCom('172.16.0.1', '203.0.113.7, 10.0.0.9'))
    }
    expect(() => guarda.canActivate(contextoCom('172.16.0.1', '203.0.113.7, 10.0.0.99'))).toThrow(
      HttpException,
    )
  })
})
