import { describe, expect, it } from 'vitest'

import * as domain from '../src/index.js'

describe('superficie publica', () => {
  it('exporta tudo o que os consumidores precisam', () => {
    const esperado = [
      'cents',
      'ZERO',
      'add',
      'sub',
      'smallest',
      'roundHalfUp',
      'distributeOverInstallments',
      'rate',
      'ZERO_RATE',
      'fromPercent',
      'toAnnual',
      'fromAnnual',
      'applyRate',
      'buildSchedule',
      'closeRow',
      'assertTerm',
      'price',
      'pricePayment',
      'sac',
      'resolvePayment',
      'revolvingStage',
      'cardDebt',
      'BRASIL',
      'BRASIL_PROVENANCE',
      'prepayWithMonthlyExtra',
      'portabilityBreakEven',
      'compare',
      'summarizeForInsight',
    ]
    for (const nome of esperado) {
      expect(Object.keys(domain), `falta exportar ${nome}`).toContain(nome)
    }
  })

  it('nao exporta mais o marcador da Fase 0', () => {
    expect(Object.keys(domain)).not.toContain('DOMAIN_READY')
  })

  it('a simulacao inteira roda so pela superficie publica', () => {
    const emprestimo = {
      principal: domain.cents(1000000),
      monthlyRate: domain.rate(0.02),
      termMonths: 24,
    }
    const comparacao = domain.compare(emprestimo, domain.cents(20000), null)
    const resumo = domain.summarizeForInsight(domain.price(emprestimo), 'loan', null)

    expect(comparacao.prepay.savedVersusKeep).toBeGreaterThan(0)
    expect(resumo.milestones).toHaveLength(3)
  })

  it('a divida de cartao roda com o preset brasileiro pela superficie publica', () => {
    const resultado = domain.cardDebt({
      invoice: domain.cents(250000),
      revolvingRate: domain.rate(0.14),
      installmentRate: domain.rate(0.07),
      installmentTermMonths: 12,
      policy: { kind: 'minimum' },
      params: domain.BRASIL,
    })
    expect(resultado.schedule.settled).toBe(true)
    expect(resultado.revolvingEndedAtPeriod).toBe(1)
  })
})
