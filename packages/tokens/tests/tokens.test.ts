import { describe, expect, it } from 'vitest'

import { toCss } from '../src/css.js'
import { tokens } from '../src/index.js'

describe('valores do AGENTS.md, copiados ao caractere', () => {
  it('as cores de fundo, borda e texto', () => {
    expect(tokens.color).toMatchObject({
      'bg-base': '#0A0A0A',
      'bg-raised': '#141414',
      'bg-sunken': '#060606',
      'border-subtle': 'rgba(255, 255, 255, 0.08)',
      'border-strong': 'rgba(255, 255, 255, 0.16)',
      'text-primary': '#EDEDED',
      'text-muted': '#8A8A8A',
      'text-faint': '#5A5A5A',
    })
  })

  it('as duas cores de sotaque, e apenas duas', () => {
    expect(tokens.color['intent-debt']).toBe('#C4552F')
    expect(tokens.color['intent-relief']).toBe('#6F8F6A')
  })

  it('o raio de borda e 4px, porque 12 ou mais e proibido', () => {
    expect(tokens.radius).toBe('4px')
  })

  it('a escala tipografica e 64 40 24 16 13 11', () => {
    expect(Object.values(tokens.typography.scale)).toEqual([
      '64px',
      '40px',
      '24px',
      '16px',
      '13px',
      '11px',
    ])
  })

  it('as familias sao General Sans e JetBrains Mono, com fallback', () => {
    expect(tokens.typography.families.display).toContain('General Sans')
    expect(tokens.typography.families.mono).toContain('JetBrains Mono')
    expect(tokens.typography.families.display).not.toContain('Inter')
  })

  it('o peso maximo e 500', () => {
    const pesos = Object.values(tokens.typography.weights).map(Number)
    expect(Math.max(...pesos)).toBe(500)
  })

  it('as duracoes ficam entre 120ms e 200ms', () => {
    for (const duracao of Object.values(tokens.motion.durations)) {
      const ms = Number(duracao.replace('ms', ''))
      expect(ms).toBeGreaterThanOrEqual(120)
      expect(ms).toBeLessThanOrEqual(200)
    }
  })

  it('nenhum easing e o ease-in-out padrao', () => {
    for (const easing of Object.values(tokens.motion.easings)) {
      expect(easing).not.toBe('ease-in-out')
      expect(easing).toMatch(/^cubic-bezier\(/)
    }
  })
})

describe('toCss', () => {
  const css = toCss(tokens)

  it('abre um bloco de custom properties no :root', () => {
    expect(css.startsWith(':root {')).toBe(false)
    expect(css).toContain(':root {')
    expect(css.trimEnd().endsWith('}')).toBe(true)
  })

  it('emite uma custom property por cor', () => {
    for (const [nome, valor] of Object.entries(tokens.color)) {
      expect(css).toContain(`--color-${nome}: ${valor};`)
    }
  })

  it('emite a escala de espaco e o raio', () => {
    for (const [nome, valor] of Object.entries(tokens.space)) {
      expect(css).toContain(`--space-${nome}: ${valor};`)
    }
    expect(css).toContain(`--radius: ${tokens.radius};`)
  })

  it('emite tipografia e movimento', () => {
    expect(css).toContain(`--font-display: ${tokens.typography.families.display};`)
    expect(css).toContain(`--font-mono: ${tokens.typography.families.mono};`)
    expect(css).toContain(`--text-display: ${tokens.typography.scale.display};`)
    expect(css).toContain(`--duration-fast: ${tokens.motion.durations.fast};`)
    expect(css).toContain(`--ease-out: ${tokens.motion.easings.out};`)
  })

  it('nao perde nenhum token entre o objeto e o CSS', () => {
    const quantos =
      Object.keys(tokens.color).length +
      Object.keys(tokens.space).length +
      Object.keys(tokens.typography.scale).length +
      Object.keys(tokens.typography.families).length +
      Object.keys(tokens.typography.weights).length +
      Object.keys(tokens.motion.durations).length +
      Object.keys(tokens.motion.easings).length +
      1 // radius
    expect(css.split('\n').filter((linha) => linha.trim().startsWith('--'))).toHaveLength(quantos)
  })

  it('avisa que o arquivo e gerado', () => {
    expect(css).toContain('Gerado por packages/tokens')
  })
})
