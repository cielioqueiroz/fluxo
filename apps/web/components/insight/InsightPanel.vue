<script setup lang="ts">
import type { InsightInput } from '@fluxo/domain'
import { computed } from 'vue'

import { formatCurrency, formatPercent, formatTerm } from '~~/lib/format'

const props = defineProps<{ summary: InsightInput }>()

/**
 * A leitura deterministica.
 *
 * Sai inteira do resumo que o dominio produziu, e nenhum numero aqui foi
 * inventado. Na Fase 6 a leitura da IA entra por cima disto, nunca no lugar:
 * se o modelo falhar duas vezes, e este texto que fica na tela.
 */
const leitura = computed(() => {
  const s = props.summary
  const frases: string[] = []

  if (s.neverSettles) {
    frases.push(
      'Neste cenario o pagamento nao cobre nem os encargos do mes, entao o saldo cresce e a divida nao termina.',
    )
  } else if (!s.settled) {
    frases.push('Dentro do horizonte simulado a divida ainda nao termina.')
  } else {
    frases.push(
      `Voce devolve ${formatCurrency(s.totalPaid)} por ${formatCurrency(s.principal)}, ao longo de ${formatTerm(s.termMonths)}.`,
    )
  }

  if (s.totalInterest > 0) {
    frases.push(
      `Juros e encargos somam ${formatCurrency(s.totalInterest)}, o equivalente a ${formatPercent(s.interestOverPrincipalPercent / 100)} do valor original.`,
    )
  }

  const metade = s.milestones.find((m) => m.fraction === 0.5)
  if (metade) {
    frases.push(
      `Metade do valor original so e amortizada no mes ${String(metade.period)}, quando ainda restam ${formatCurrency(metade.balance)}.`,
    )
  }

  if (s.capReachedAtPeriod !== null) {
    frases.push(
      `No mes ${String(s.capReachedAtPeriod)} os encargos batem no teto de 100% do valor original e param de crescer.`,
    )
  }

  return frases
})
</script>

<template>
  <div class="insight">
    <div class="insight__body">
      <p v-for="(frase, indice) in leitura" :key="indice" class="prose">{{ frase }}</p>
    </div>

    <p class="insight__pending">
      <span class="insight__pendingMark" aria-hidden="true">&bull;</span>
      A leitura escrita pelo agente, com citacao de fonte publica, entra nesta secao na Fase 6. Ate
      la, o texto acima e calculado, nao gerado.
    </p>

    <p class="insight__notice">
      Material educativo. Nao e recomendacao de produto financeiro. Os valores sao uma simulacao e
      podem diferir do contrato do seu banco. A comparacao e nominal, sem correcao pelo valor do
      dinheiro no tempo.
    </p>
  </div>
</template>

<style scoped>
.insight {
  display: flex;
  flex-direction: column;
  gap: var(--space-6);
}

.insight__body {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}

.insight__body .prose {
  font-size: var(--text-heading);
  line-height: 1.45;
  color: var(--color-text-primary);
  max-width: 54ch;
}

.insight__pending {
  display: flex;
  gap: var(--space-2);
  font-family: var(--font-mono);
  font-size: var(--text-label);
  line-height: 1.7;
  text-transform: uppercase;
  letter-spacing: 0.12em;
  color: var(--color-text-faint);
  max-width: 60ch;
}

.insight__notice {
  padding-top: var(--space-4);
  border-top: 1px solid var(--color-border-subtle);
  font-size: var(--text-small);
  color: var(--color-text-faint);
  max-width: 60ch;
}
</style>
