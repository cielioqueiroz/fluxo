<script setup lang="ts">
import type { Comparison } from '@fluxo/domain'
import { computed } from 'vue'

import { formatCurrency, formatMonthlyRate, formatTerm } from '~~/lib/format'

const props = defineProps<{ comparison: Comparison }>()

const cenarios = computed(() => {
  const maior = Math.max(props.comparison.keep.totalPaid, props.comparison.prepay.totalPaid, 1)
  return [
    {
      key: 'keep',
      nome: 'Manter como esta',
      resumo: props.comparison.keep,
      proporcao: props.comparison.keep.totalPaid / maior,
    },
    {
      key: 'prepay',
      nome: 'Pagar mais por mes',
      resumo: props.comparison.prepay,
      proporcao: props.comparison.prepay.totalPaid / maior,
    },
  ]
})
</script>

<template>
  <div class="comparison">
    <div v-for="cenario in cenarios" :key="cenario.key" class="comparison__row">
      <p class="comparison__name">{{ cenario.nome }}</p>

      <div class="comparison__bar" aria-hidden="true">
        <div
          class="comparison__fill"
          :class="cenario.key === 'prepay' ? 'comparison__fill--relief' : ''"
          :style="{ inlineSize: `${(cenario.proporcao * 100).toFixed(2)}%` }"
        />
      </div>

      <div class="comparison__numbers">
        <UiValue size="body" label="Total pago">
          {{ formatCurrency(cenario.resumo.totalPaid) }}
        </UiValue>
        <span class="comparison__term">{{ formatTerm(cenario.resumo.termMonths) }}</span>
      </div>
    </div>

    <p v-if="comparison.prepay.savedVersusKeep > 0" class="comparison__delta">
      Pagando a mais todo mes voce deixa de gastar
      <UiValue intent="relief" size="body">
        {{ formatCurrency(comparison.prepay.savedVersusKeep) }}
      </UiValue>
      e termina
      <UiValue intent="relief" size="body">
        {{ formatTerm(comparison.prepay.savedVersusKeepMonths) }}
      </UiValue>
      antes.
    </p>

    <!--
      Portar nao e um terceiro cenario, e um limiar. Na taxa de equilibrio ele
      economiza por definicao o mesmo que antecipar, entao o numero util e a
      taxa que voce precisa procurar no mercado.
    -->
    <div class="comparison__threshold">
      <UiLabel>Portabilidade</UiLabel>
      <p class="comparison__thresholdText">
        Trocar de banco so ganha de pagar mais por mes se voce conseguir taxa abaixo de
        <UiValue intent="relief" size="body">
          {{ formatMonthlyRate(comparison.portability.breakEvenMonthlyRate) }}
        </UiValue>
      </p>
    </div>
  </div>
</template>

<style scoped>
.comparison {
  display: flex;
  flex-direction: column;
  gap: var(--space-6);
}

.comparison__row {
  display: grid;
  grid-template-columns: 1fr;
  gap: var(--space-2);
  padding-bottom: var(--space-4);
  border-bottom: 1px solid var(--color-border-subtle);
}

.comparison__name {
  font-size: var(--text-small);
  color: var(--color-text-muted);
}

.comparison__bar {
  block-size: 8px;
  background: var(--color-bg-sunken);
  border: 1px solid var(--color-border-subtle);
  border-radius: var(--radius);
  overflow: hidden;
}

.comparison__fill {
  block-size: 100%;
  background: var(--color-intent-debt);
}

.comparison__fill--relief {
  background: var(--color-intent-relief);
}

.comparison__numbers {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: var(--space-4);
}

.comparison__term {
  font-family: var(--font-mono);
  font-size: var(--text-label);
  text-transform: uppercase;
  letter-spacing: 0.12em;
  color: var(--color-text-faint);
}

.comparison__delta {
  color: var(--color-text-muted);
  max-width: 46ch;
}

.comparison__threshold {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  padding-top: var(--space-4);
  border-top: 1px solid var(--color-border-subtle);
}

.comparison__thresholdText {
  color: var(--color-text-muted);
  max-width: 46ch;
}
</style>
