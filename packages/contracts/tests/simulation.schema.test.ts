import { describe, expect, it } from 'vitest'

import { signedCentsSchema } from '../src/money.schema.js'
import {
  cardSimulationInputSchema,
  loanSimulationInputSchema,
  scheduleSchema,
  simulationInputSchema,
} from '../src/simulation.schema.js'

const emprestimo = {
  kind: 'loan',
  principal: 1000000,
  monthlyRate: 0.015,
  termMonths: 24,
  system: 'price',
  monthlyExtra: 0,
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

describe('signedCentsSchema', () => {
  it('aceita negativo, que e a divida crescendo', () => {
    expect(signedCentsSchema.parse(-500)).toBe(-500)
  })

  it('ainda recusa fracao', () => {
    expect(signedCentsSchema.safeParse(-1.5).success).toBe(false)
  })
})

describe('entrada de emprestimo', () => {
  it('aceita um payload valido e marca os valores', () => {
    const lido = loanSimulationInputSchema.parse(emprestimo)
    expect(lido.principal).toBe(1000000)
    expect(lido.system).toBe('price')
  })

  it('aceita SAC', () => {
    expect(loanSimulationInputSchema.parse({ ...emprestimo, system: 'sac' }).system).toBe('sac')
  })

  it('recusa sistema de amortizacao desconhecido', () => {
    expect(loanSimulationInputSchema.safeParse({ ...emprestimo, system: 'frances' }).success).toBe(
      false,
    )
  })

  it('recusa principal negativo', () => {
    expect(loanSimulationInputSchema.safeParse({ ...emprestimo, principal: -1 }).success).toBe(
      false,
    )
  })

  it('recusa prazo zero', () => {
    expect(loanSimulationInputSchema.safeParse({ ...emprestimo, termMonths: 0 }).success).toBe(
      false,
    )
  })

  it('recusa campo desconhecido', () => {
    expect(loanSimulationInputSchema.safeParse({ ...emprestimo, sobrando: 1 }).success).toBe(false)
  })
})

describe('entrada de cartao', () => {
  it('aceita um payload valido', () => {
    const lido = cardSimulationInputSchema.parse(cartao)
    expect(lido.preset).toBe('brasil')
    expect(lido.policy.kind).toBe('minimum')
  })

  it('aceita prazo de parcelamento zero, que e o motor generico', () => {
    expect(
      cardSimulationInputSchema.parse({ ...cartao, installmentTermMonths: 0 })
        .installmentTermMonths,
    ).toBe(0)
  })

  it('a politica fixa exige o valor', () => {
    expect(
      cardSimulationInputSchema.safeParse({ ...cartao, policy: { kind: 'fixed' } }).success,
    ).toBe(false)
    expect(
      cardSimulationInputSchema.parse({ ...cartao, policy: { kind: 'fixed', amount: 50000 } })
        .policy,
    ).toEqual({ kind: 'fixed', amount: 50000 })
  })

  it('recusa preset desconhecido', () => {
    expect(cardSimulationInputSchema.safeParse({ ...cartao, preset: 'suica' }).success).toBe(false)
  })

  it('o cliente nao dita regulacao: params injetado e recusado', () => {
    const ataque = {
      ...cartao,
      params: { revolvingCycleLimit: 999, minimumFraction: 0, iof: null, totalChargeCap: null },
    }
    expect(cardSimulationInputSchema.safeParse(ataque).success).toBe(false)
  })

  it('tambem recusa teto injetado solto', () => {
    expect(cardSimulationInputSchema.safeParse({ ...cartao, totalChargeCap: null }).success).toBe(
      false,
    )
  })
})

describe('uniao discriminada', () => {
  it('escolhe o ramo pelo kind', () => {
    expect(simulationInputSchema.parse(emprestimo).kind).toBe('loan')
    expect(simulationInputSchema.parse(cartao).kind).toBe('card')
  })

  it('recusa kind desconhecido', () => {
    expect(simulationInputSchema.safeParse({ ...emprestimo, kind: 'consorcio' }).success).toBe(
      false,
    )
  })

  it('nao aceita campos de cartao em um emprestimo', () => {
    expect(simulationInputSchema.safeParse({ ...emprestimo, preset: 'brasil' }).success).toBe(false)
  })
})

describe('schema de saida', () => {
  it('aceita uma tabela com amortizacao negativa', () => {
    const tabela = {
      installments: [
        {
          period: 1,
          stage: 'revolving',
          openingBalance: 100000,
          interest: 20000,
          fees: 0,
          amortization: -2000,
          payment: 18000,
          closingBalance: 102000,
        },
      ],
      principal: 100000,
      totalPaid: 18000,
      totalInterest: 20000,
      totalFees: 0,
      finalBalance: 102000,
      settled: false,
      neverSettles: true,
      termMonths: 1,
    }
    expect(scheduleSchema.safeParse(tabela).success).toBe(true)
  })

  it('recusa estagio desconhecido', () => {
    const tabela = {
      installments: [
        {
          period: 1,
          stage: 'consignado',
          openingBalance: 100,
          interest: 0,
          fees: 0,
          amortization: 100,
          payment: 100,
          closingBalance: 0,
        },
      ],
      principal: 100,
      totalPaid: 100,
      totalInterest: 0,
      totalFees: 0,
      finalBalance: 0,
      settled: true,
      neverSettles: false,
      termMonths: 1,
    }
    expect(scheduleSchema.safeParse(tabela).success).toBe(false)
  })
})
