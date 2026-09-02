import { BadRequestException, HttpStatus, type ArgumentsHost } from '@nestjs/common'
import { describe, expect, it, vi } from 'vitest'

import { HttpExceptionFilter } from '../src/common/filters/http-exception.filter.js'
import { RateLimitGuard } from '../src/common/guards/rate-limit.guard.js'
import { loadEnv } from '../src/config/env.schema.js'

function hospedeiro(): {
  host: ArgumentsHost
  enviado: () => { status: number; corpo: Record<string, unknown> }
} {
  let status = 0
  let corpo: Record<string, unknown> = {}
  const resposta = {
    status: (codigo: number) => {
      status = codigo
      return resposta
    },
    send: (payload: Record<string, unknown>) => {
      corpo = payload
    },
  }
  const host = {
    switchToHttp: () => ({
      getResponse: () => resposta,
      getRequest: () => ({ requestId: 'rastro-1', method: 'POST', url: '/simulation' }),
    }),
  } as unknown as ArgumentsHost

  return { host, enviado: () => ({ status, corpo }) }
}

describe('HttpExceptionFilter', () => {
  it('preserva a mensagem de erro conhecido e acrescenta o rastro', () => {
    const { host, enviado } = hospedeiro()
    new HttpExceptionFilter().catch(new BadRequestException({ message: 'invalido' }), host)
    const { status, corpo } = enviado()
    expect(status).toBe(HttpStatus.BAD_REQUEST)
    expect(corpo['message']).toBe('invalido')
    expect(corpo['requestId']).toBe('rastro-1')
  })

  it('erro desconhecido nunca vaza stack para o cliente', () => {
    const { host, enviado } = hospedeiro()
    // O logger escreve no console, e aqui ele so atrapalharia a leitura.
    vi.spyOn(console, 'error').mockImplementation(() => undefined)

    const segredo = new Error('senha do banco = 12345')
    segredo.stack = 'stack com caminho interno'
    new HttpExceptionFilter().catch(segredo, host)

    const { status, corpo } = enviado()
    expect(status).toBe(HttpStatus.INTERNAL_SERVER_ERROR)
    expect(corpo['message']).toBe('Erro interno')
    const serializado = JSON.stringify(corpo)
    expect(serializado).not.toContain('senha do banco')
    expect(serializado).not.toContain('stack com caminho interno')
  })

  it('excecao que nao e objeto tambem vira resposta, e nao derruba o processo', () => {
    const { host, enviado } = hospedeiro()
    vi.spyOn(console, 'error').mockImplementation(() => undefined)
    new HttpExceptionFilter().catch('algo estranho', host)
    expect(enviado().status).toBe(HttpStatus.INTERNAL_SERVER_ERROR)
  })
})

describe('RateLimitGuard, limpeza de janelas', () => {
  it('esquece janelas vencidas em vez de crescer sem fim', () => {
    vi.useFakeTimers()
    try {
      const env = loadEnv({ RATE_LIMIT_MAX: '2', RATE_LIMIT_WINDOW_MS: '1000' })
      const guarda = new RateLimitGuard(env)
      const contexto = (ip: string) =>
        ({ switchToHttp: () => ({ getRequest: () => ({ ip, headers: {} }) }) }) as never

      guarda.canActivate(contexto('10.0.0.1'))
      guarda.canActivate(contexto('10.0.0.1'))

      // Passada a janela, o mesmo endereco volta a ter direito ao teto inteiro.
      vi.advanceTimersByTime(1500)
      expect(guarda.canActivate(contexto('10.0.0.1'))).toBe(true)
      expect(guarda.canActivate(contexto('10.0.0.1'))).toBe(true)
    } finally {
      vi.useRealTimers()
    }
  })
})
