<script setup lang="ts">
import { add, largest, type Schedule } from '@fluxo/domain'
import { computed, ref, useId } from 'vue'

import { formatCurrency } from '~~/lib/format'

const props = defineProps<{ schedule: Schedule }>()

/**
 * O retangulo que revela a curva conforme o scroll.
 *
 * Fica exposto para a camada 3 escalar por `transform`. Nao usamos
 * `stroke-dashoffset`, que seria o caminho obvio, porque a secao 5 do
 * AGENTS.md manda animar apenas `transform` e `opacity`. Escalar o recorte
 * respeita a regra e da o mesmo desenho progressivo.
 *
 * Parado, o retangulo esta em escala cheia, entao a curva aparece inteira sem
 * nenhum script. E isso que faz o modo de movimento reduzido continuar legivel.
 */
const revelador = ref<SVGRectElement | null>(null)
defineExpose({ revelador })

const clipId = `revelar-${useId()}`

/** O topo da escala, em dinheiro de verdade, para o rotulo acessivel. */
const tetoEmDinheiro = computed(() =>
  largest(add(props.schedule.totalInterest, props.schedule.totalFees), props.schedule.principal),
)

const LARGURA = 640
const ALTURA = 360
const TOPO = 24
const BASE = 312

/**
 * Juros acumulados contra principal amortizado, ao longo do tempo.
 *
 * As duas curvas partem do mesmo canto. Onde elas se cruzam e o mes em que a
 * divida passa a devolver mais principal do que custa em juros. Em taxa alta
 * esse cruzamento acontece tarde, e e isso que a secao existe para mostrar.
 */
const curvas = computed(() => {
  const linhas = props.schedule.installments
  if (linhas.length === 0) {
    return null
  }

  let juros = 0
  let principal = 0
  const jurosPontos: string[] = []
  const principalPontos: string[] = []

  const teto = Math.max(tetoEmDinheiro.value, 1)
  const passo = LARGURA / Math.max(1, linhas.length - 1)

  for (const [indice, linha] of linhas.entries()) {
    juros += linha.interest + linha.fees
    principal += Math.max(0, linha.amortization)
    const x = indice * passo
    jurosPontos.push(`${x},${BASE - (juros / teto) * (BASE - TOPO)}`)
    principalPontos.push(`${x},${BASE - (principal / teto) * (BASE - TOPO)}`)
  }

  return {
    juros: jurosPontos.join(' '),
    principal: principalPontos.join(' '),
  }
})
</script>

<template>
  <figure v-if="curvas" class="chart">
    <svg
      class="chart__svg"
      :viewBox="`0 0 ${LARGURA} ${ALTURA}`"
      role="img"
      preserveAspectRatio="none"
      :aria-label="`Duas curvas acumuladas ao longo de ${schedule.termMonths} meses. O topo da escala e ${formatCurrency(tetoEmDinheiro)}.`"
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
      <line
        :x1="0"
        :y1="TOPO"
        :x2="LARGURA"
        :y2="TOPO"
        stroke="var(--color-border-subtle)"
        stroke-width="1"
        stroke-dasharray="2 6"
        vector-effect="non-scaling-stroke"
      />

      <defs>
        <clipPath :id="clipId">
          <rect ref="revelador" :x="0" :y="0" :width="LARGURA" :height="ALTURA" />
        </clipPath>
      </defs>

      <g :clip-path="`url(#${clipId})`">
        <polyline
          :points="curvas.principal"
          fill="none"
          stroke="var(--color-text-faint)"
          stroke-width="1.5"
          vector-effect="non-scaling-stroke"
        />
        <polyline
          :points="curvas.juros"
          fill="none"
          stroke="var(--color-intent-debt)"
          stroke-width="2"
          vector-effect="non-scaling-stroke"
        />
      </g>
    </svg>

    <figcaption class="chart__caption">
      <span class="chart__key">
        <span class="chart__line chart__line--debt" aria-hidden="true" />
        Juros e encargos acumulados
      </span>
      <span class="chart__key">
        <span class="chart__line chart__line--principal" aria-hidden="true" />
        Principal amortizado
      </span>
    </figcaption>
  </figure>
</template>

<style scoped>
.chart {
  margin: 0;
}

.chart__svg {
  width: 100%;
  height: clamp(280px, 48vh, 480px);
}

.chart__caption {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-6);
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

.chart__line {
  width: 18px;
  height: 2px;
}

.chart__line--debt {
  background: var(--color-intent-debt);
}

.chart__line--principal {
  background: var(--color-text-faint);
}
</style>
