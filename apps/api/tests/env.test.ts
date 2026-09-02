import { describe, expect, it } from 'vitest'

import { loadEnv } from '../src/config/env.schema.js'

/**
 * O ambiente e borda, entao passa por Zod como qualquer outra entrada.
 *
 * O teste que mais importa aqui e o ultimo: a API precisa subir sem banco e sem
 * chave de modelo, porque a simulacao e deterministica e nao depende de
 * nenhum dos dois.
 */
describe('loadEnv', () => {
  it('assume valores de reposicao sensatos', () => {
    const env = loadEnv({})
    expect(env.NODE_ENV).toBe('development')
    expect(env.PORT).toBe(3333)
    expect(env.CORS_ORIGINS).toEqual(['http://localhost:3000'])
  })

  it('le a porta como numero, e nao como texto', () => {
    expect(loadEnv({ PORT: '8080' }).PORT).toBe(8080)
  })

  it('recusa porta fora da faixa', () => {
    expect(() => loadEnv({ PORT: '70000' })).toThrow(/PORT/)
  })

  it('parte a lista de origens e limpa espaco', () => {
    const env = loadEnv({ CORS_ORIGINS: 'https://a.com, https://b.com ,' })
    expect(env.CORS_ORIGINS).toEqual(['https://a.com', 'https://b.com'])
  })

  it('recusa DATABASE_URL que nao e postgres', () => {
    expect(() => loadEnv({ DATABASE_URL: 'mysql://x/y' })).toThrow(/DATABASE_URL/)
  })

  it('aceita DATABASE_URL do Neon', () => {
    const url = 'postgresql://u:p@host.neon.tech/fluxo?sslmode=require'
    expect(loadEnv({ DATABASE_URL: url }).DATABASE_URL).toBe(url)
  })

  it('junta todos os problemas em uma mensagem so', () => {
    try {
      loadEnv({ PORT: 'abc', DATABASE_URL: 'nao-e-url' })
      expect.unreachable('deveria ter lancado')
    } catch (erro) {
      const mensagem = erro instanceof Error ? erro.message : ''
      expect(mensagem).toContain('PORT')
      expect(mensagem).toContain('DATABASE_URL')
    }
  })

  it('sobe sem banco e sem chave de modelo', () => {
    const env = loadEnv({ NODE_ENV: 'production' })
    expect(env.DATABASE_URL).toBeUndefined()
    expect(env.GEMINI_API_KEY).toBeUndefined()
  })
})
