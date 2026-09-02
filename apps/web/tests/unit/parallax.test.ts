import { describe, expect, it } from 'vitest'

import { PARALLAX } from '../../composables/useParallaxLayer'

/**
 * A tabela de fatores da secao 5 do AGENTS.md.
 *
 * Nao e teste de fachada. O fator errado nao quebra nada visivelmente, ele so
 * faz a cena parecer chapada, e isso passa despercebido em revisao. Aqui ele
 * quebra a suite.
 */
describe('fatores de parallax', () => {
  it('bate com a tabela da secao 5, camada por camada', () => {
    expect(PARALLAX.noise).toBe(0.1)
    expect(PARALLAX.columns).toBe(0.4)
    expect(PARALLAX.curve).toBe(0.8)
    expect(PARALLAX.text).toBe(1)
  })

  it('a camada de texto anda junto com a pagina, entao nao ganha deslocamento', () => {
    expect(1 - PARALLAX.text).toBe(0)
  })

  it('o deslocamento cresce quanto mais parada a camada', () => {
    const deslocamento = (fator: number): number => 1 - fator
    expect(deslocamento(PARALLAX.noise)).toBeGreaterThan(deslocamento(PARALLAX.columns))
    expect(deslocamento(PARALLAX.columns)).toBeGreaterThan(deslocamento(PARALLAX.curve))
    expect(deslocamento(PARALLAX.curve)).toBeGreaterThan(deslocamento(PARALLAX.text))
  })

  it('nenhum fator sai do intervalo de zero a um', () => {
    for (const fator of Object.values(PARALLAX)) {
      expect(fator).toBeGreaterThanOrEqual(0)
      expect(fator).toBeLessThanOrEqual(1)
    }
  })
})
