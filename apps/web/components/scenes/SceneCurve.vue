<script setup lang="ts">
import type { Schedule } from '@fluxo/domain'
import { onBeforeUnmount, onMounted, ref, useTemplateRef } from 'vue'

import { useParallaxLayer, PARALLAX } from '~~/composables/useParallaxLayer'
import { useReducedMotion } from '~~/composables/useReducedMotion'
import { useSceneContext } from '~~/composables/useScrollScene'
import { gsap } from '~~/lib/gsap'

/**
 * Camada 3, a curva de juros desenhada conforme o scroll.
 *
 * Nao redesenha a curva: reaproveita `ChartAmortization`, que ja existe desde a
 * Fase 3 e continua sendo a versao parada. O que esta camada acrescenta e o
 * recorte que revela o traco e o deslocamento de parallax com fator 0.8.
 */
defineProps<{ schedule: Schedule }>()

const raiz = ref<HTMLElement | null>(null)
const grafico = useTemplateRef<{ revelador: SVGRectElement | null }>('grafico')

const cena = useSceneContext()
const movimentoReduzido = useReducedMotion()

useParallaxLayer(raiz, PARALLAX.curve)

let cancelar: (() => void) | null = null

onMounted(() => {
  if (movimentoReduzido.value || cena === null) {
    return
  }
  const alvo = grafico.value?.revelador
  if (!alvo) {
    return
  }

  // Escala do recorte, e nao `stroke-dashoffset`: a regra manda animar apenas
  // `transform`. A origem fica na esquerda para o traco crescer da origem.
  gsap.set(alvo, { transformOrigin: 'left center' })
  const escrever = gsap.quickSetter(alvo, 'scaleX') as (valor: number) => void

  cancelar = cena.registerLayer((progresso) => {
    // A curva termina de ser desenhada bem antes de a secao sair da tela, para
    // o usuario ver o traco completo e nao so o fim dele.
    escrever(Math.min(1, Math.max(0.02, progresso * 1.9)))
  })
})

onBeforeUnmount(() => {
  cancelar?.()
  cancelar = null
})
</script>

<template>
  <div ref="raiz" class="curve">
    <ChartAmortization ref="grafico" :schedule="schedule" />
  </div>
</template>

<style scoped>
.curve {
  will-change: auto;
}
</style>
