import {
  BRASIL,
  cardDebt,
  cents,
  compare,
  price,
  rate,
  sac,
  summarizeForInsight,
  type CardOutcome,
  type Comparison,
  type InsightInput,
  type Schedule,
} from '@fluxo/domain'
import { defineStore } from 'pinia'
import { computed, ref } from 'vue'

import { parseCurrencyInput, parseIntegerInput, parseRateInput } from '~~/lib/format'

export type DebtKind = 'loan' | 'card'
export type LoanSystem = 'price' | 'sac'

/**
 * O estado do cenario.
 *
 * O calculo roda no navegador, contra `packages/domain`, entao a pagina e
 * completa e instantanea sem a API. A Fase 5 acrescenta a API para o que o
 * navegador nao pode fazer, e a Fase 6 poe a leitura da IA por cima do resumo
 * deterministico que ja existe aqui.
 */
export const useSimulationStore = defineStore('simulation', () => {
  /* Entrada, como texto, porque e o que o usuario digita
     ----------------------------------------------------------------------- */

  const kind = ref<DebtKind>('loan')

  const amountInput = ref('30.000,00')
  const monthlyRateInput = ref('1,79')
  const termInput = ref('48')
  const system = ref<LoanSystem>('price')
  const monthlyExtraInput = ref('200,00')

  const installmentRateInput = ref('7,50')
  const installmentTermInput = ref('12')

  /* Leitura, com valores de reposicao quando o campo esta vazio
     ----------------------------------------------------------------------- */

  const amount = computed(() => cents(Math.max(0, parseCurrencyInput(amountInput.value) ?? 0)))
  const monthlyRate = computed(() =>
    rate(Math.min(10, Math.max(0, parseRateInput(monthlyRateInput.value) ?? 0))),
  )
  const termMonths = computed(() =>
    Math.min(600, Math.max(1, parseIntegerInput(termInput.value) ?? 1)),
  )
  const monthlyExtra = computed(() =>
    cents(Math.max(0, parseCurrencyInput(monthlyExtraInput.value) ?? 0)),
  )
  const installmentRate = computed(() =>
    rate(Math.min(10, Math.max(0, parseRateInput(installmentRateInput.value) ?? 0))),
  )
  const installmentTermMonths = computed(() =>
    Math.min(600, Math.max(1, parseIntegerInput(installmentTermInput.value) ?? 1)),
  )

  const isEmpty = computed(() => amount.value === 0)

  /* Resultado
     ----------------------------------------------------------------------- */

  const loan = computed(() => ({
    principal: amount.value,
    monthlyRate: monthlyRate.value,
    termMonths: termMonths.value,
  }))

  const card = computed<CardOutcome | null>(() => {
    if (kind.value !== 'card' || isEmpty.value) {
      return null
    }
    return cardDebt({
      invoice: amount.value,
      revolvingRate: monthlyRate.value,
      installmentRate: installmentRate.value,
      installmentTermMonths: installmentTermMonths.value,
      policy: { kind: 'minimum' },
      params: BRASIL,
    })
  })

  const schedule = computed<Schedule | null>(() => {
    if (isEmpty.value) {
      return null
    }
    if (kind.value === 'card') {
      return card.value?.schedule ?? null
    }
    return system.value === 'sac' ? sac(loan.value) : price(loan.value)
  })

  /** Comparacao so existe para emprestimo. O cartao nao tem antecipacao nesta fase. */
  const comparison = computed<Comparison | null>(() => {
    if (kind.value !== 'loan' || isEmpty.value) {
      return null
    }
    return compare(loan.value, monthlyExtra.value, null)
  })

  const summary = computed<InsightInput | null>(() => {
    const tabela = schedule.value
    if (tabela === null) {
      return null
    }
    return summarizeForInsight(tabela, kind.value, card.value?.capReachedAtPeriod ?? null)
  })

  return {
    kind,
    amountInput,
    monthlyRateInput,
    termInput,
    system,
    monthlyExtraInput,
    installmentRateInput,
    installmentTermInput,

    amount,
    monthlyRate,
    termMonths,
    monthlyExtra,
    installmentRate,
    installmentTermMonths,
    isEmpty,

    schedule,
    card,
    comparison,
    summary,
  }
})
