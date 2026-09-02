<script setup lang="ts">
import type { Schedule } from '@fluxo/domain'
import { computed } from 'vue'

import { formatCurrency, formatTerm } from '~~/lib/format'

const props = defineProps<{ schedule: Schedule }>()

const LARGURA = 640
const ALTURA = 320
const BASE = 288

/**
 * Uma coluna por parcela, altura proporcional ao pagamento, e cada coluna
 * dividida entre juros e amortizacao.
 *
 * Na Fase 4 estas colunas viram geometria 3D em TresJS, lendo os mesmos
 * numeros. Aqui elas sao SVG parado, e precisam ficar boas paradas.
 */
const colunas = computed(() => {
  const linhas = props.schedule.installments
  if (linhas.length === 0) {
    return []
  }
  const maior = Math.max(...linhas.map((l) => l.payment))
  if (maior <= 0) {
    return []
  }
  const passo = LARGURA / linhas.length
  const largura = Math.max(1, passo - Math.min(2, passo * 0.25))

  return linhas.map((linha, indice) => {
    const alturaTotal = (linha.payment / maior) * BASE
    const encargo = linha.interest + linha.fees
    const alturaEncargo = (encargo / maior) * BASE
    return {
      key: linha.period,
      x: indice * passo,
      largura,
      topo: BASE - alturaTotal,
      alturaTotal,
      topoEncargo: BASE - alturaEncargo,
      alturaEncargo,
      stage: linha.stage,
    }
  })
})

const primeira = computed(() => props.schedule.installments[0])
const ultima = computed(() => props.schedule.installments[props.schedule.installments.length - 1])
</script>

<template>
  <figure class="chart">
    <svg
      class="chart__svg"
      :viewBox="`0 0 ${LARGURA} ${ALTURA}`"
      role="img"
      preserveAspectRatio="none"
      :aria-label="`Cada coluna e uma parcela. Sao ${schedule.termMonths} parcelas, a primeira de ${formatCurrency(primeira?.payment ?? schedule.principal)} e a ultima de ${formatCurrency(ultima?.payment ?? schedule.principal)}.`"
    >
      <line
        :x1="0"
        :y1="BASE"
        :x2="LARGURA"
        :y2="BASE"
        stroke="var(--color-border-strong)"
        stroke-width="1"
        vector-effect="non-scaling-stroke"
      />

      <g v-for="coluna in colunas" :key="coluna.key">
        <rect
          :x="coluna.x"
          :y="coluna.topo"
          :width="coluna.largura"
          :height="coluna.alturaTotal"
          fill="var(--color-bg-raised)"
        />
        <rect
          :x="coluna.x"
          :y="coluna.topoEncargo"
          :width="coluna.largura"
          :height="coluna.alturaEncargo"
          fill="var(--color-intent-debt)"
        />
      </g>
    </svg>

    <figcaption class="chart__caption">
      <span class="chart__key">
        <span class="chart__swatch chart__swatch--debt" aria-hidden="true" />
        Juros e encargos
      </span>
      <span class="chart__key">
        <span class="chart__swatch chart__swatch--principal" aria-hidden="true" />
        Amortizacao
      </span>
      <span class="chart__count">{{ formatTerm(schedule.termMonths) }}</span>
    </figcaption>
  </figure>
</template>

<style scoped>
.chart {
  margin: 0;
}

.chart__svg {
  width: 100%;
  height: clamp(260px, 46vh, 460px);
  border-bottom: 0;
}

.chart__caption {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--space-4);
  padding-top: var(--space-3);
  font-family: var(--font-mono);
  font-size: var(--text-label);
  text-transform: uppercase;
  letter-spacing: 0.12em;
  color: var(--color-text-faint);
}

.chart__key {
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
}

.chart__swatch {
  width: 10px;
  height: 10px;
  border-radius: 1px;
}

.chart__swatch--debt {
  background: var(--color-intent-debt);
}

.chart__swatch--principal {
  background: var(--color-bg-raised);
  border: 1px solid var(--color-border-strong);
}

.chart__count {
  margin-left: auto;
  font-variant-numeric: tabular-nums;
}
</style>
