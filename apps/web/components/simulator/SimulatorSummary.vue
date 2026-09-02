<script setup lang="ts">
import { add, type InsightInput } from '@fluxo/domain'
import { computed } from 'vue'

import { formatCurrency, formatPercent, formatTerm } from '~~/lib/format'

/**
 * Le o resumo, e nao a tabela.
 *
 * A tabela tambem tem todos estes valores, mas recalcular o percentual aqui
 * fazia a secao 4 mostrar 49,88% enquanto a secao 6 mostrava 49,90%, porque o
 * dominio arredonda para uma casa e o componente nao arredondava. Numero unico
 * exige fonte unica.
 */
const props = defineProps<{ summary: InsightInput }>()

const custoTotal = computed(() => add(props.summary.totalInterest, props.summary.totalFees))
</script>

<template>
  <dl class="summary">
    <div class="summary__row">
      <dt class="summary__term">Total pago</dt>
      <dd class="summary__value">
        <UiValue size="title">{{ formatCurrency(summary.totalPaid) }}</UiValue>
      </dd>
    </div>

    <div class="summary__row">
      <dt class="summary__term">Só de juros e encargos</dt>
      <dd class="summary__value">
        <UiValue intent="debt" size="title">{{ formatCurrency(custoTotal) }}</UiValue>
      </dd>
    </div>

    <div class="summary__row">
      <dt class="summary__term">Juros sobre o valor original</dt>
      <dd class="summary__value">
        <UiValue intent="debt" size="heading">
          {{ formatPercent(summary.interestOverPrincipalPercent / 100) }}
        </UiValue>
      </dd>
    </div>

    <div class="summary__row">
      <dt class="summary__term">Prazo</dt>
      <dd class="summary__value">
        <UiValue size="heading">{{ formatTerm(summary.termMonths) }}</UiValue>
      </dd>
    </div>
  </dl>
</template>

<style scoped>
/*
 * Razao contabil: rotulo apagado a esquerda, valor alinhado a direita, filete
 * de 1px entre as linhas. Sem card, sem sombra.
 */
.summary {
  margin: 0;
  border-top: 1px solid var(--color-border-subtle);
}

.summary__row {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: var(--space-4);
  padding-block: var(--space-4);
  border-bottom: 1px solid var(--color-border-subtle);
}

.summary__term {
  font-size: var(--text-small);
  color: var(--color-text-muted);
}

.summary__value {
  margin: 0;
  text-align: right;
}
</style>
