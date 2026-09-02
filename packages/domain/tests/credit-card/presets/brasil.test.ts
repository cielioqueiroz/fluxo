import { describe, expect, it } from 'vitest'

import { type CardParams } from '../../../src/credit-card/params.js'
import { BRASIL, BRASIL_PROVENANCE } from '../../../src/credit-card/presets/brasil.js'

const CAMPOS: readonly (keyof CardParams)[] = [
  'revolvingCycleLimit',
  'minimumFraction',
  'iof',
  'totalChargeCap',
]

describe('preset brasileiro', () => {
  it('limita o rotativo a um ciclo, como manda a Resolucao CMN 4.549', () => {
    expect(BRASIL.revolvingCycleLimit).toBe(1)
  })

  it('limita os encargos a cem por cento do valor original', () => {
    expect(BRASIL.totalChargeCap).toBe(1)
  })

  it('carrega o IOF de pessoa fisica com o limite de 365 dias', () => {
    expect(BRASIL.iof).toEqual({ fixed: 0.0038, daily: 0.000082, dailyCapDays: 365 })
  })

  it('documenta a fonte de todo campo do preset', () => {
    for (const campo of CAMPOS) {
      const entrada = BRASIL_PROVENANCE.find((p) => p.field === campo)
      expect(entrada, `campo ${campo} sem fonte declarada`).toBeDefined()
      expect(entrada?.authority.length).toBeGreaterThan(0)
      expect(entrada?.source).toMatch(/^https?:\/\//)
      expect(entrada?.effectiveFrom).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    }
  })

  it('nao declara fonte para campo que nao existe', () => {
    for (const entrada of BRASIL_PROVENANCE) {
      expect(CAMPOS).toContain(entrada.field)
    }
  })

  it('marca o minimo de quinze por cento como pratica, nao como norma', () => {
    const minimo = BRASIL_PROVENANCE.find((p) => p.field === 'minimumFraction')
    expect(minimo?.kind).toBe('market-practice')
  })

  it('marca o teto e o limite de ciclos como norma', () => {
    for (const campo of ['totalChargeCap', 'revolvingCycleLimit'] as const) {
      expect(BRASIL_PROVENANCE.find((p) => p.field === campo)?.kind).toBe('regulation')
    }
  })
})
