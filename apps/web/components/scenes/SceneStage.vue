<script setup lang="ts">
import { ref } from 'vue'

import { PARALLAX, useParallaxLayer, type ParallaxFactor } from '~~/composables/useParallaxLayer'
import { useScrollScene } from '~~/composables/useScrollScene'

/**
 * Orquestrador de uma secao da narrativa.
 *
 * Cria o unico ScrollTrigger mestre da secao, oferece o contexto para as
 * camadas filhas se registrarem, e aplica o parallax as duas colunas: o texto
 * anda com a pagina, fator 1.0, e a cena anda com o fator que a secao escolher.
 *
 * Quando o usuario pede movimento reduzido, nada disto acontece. O componente
 * continua sendo uma `section` com duas colunas, que e exatamente o que a
 * Fase 3 entregou.
 */
const props = withDefaults(
  defineProps<{
    /** Numero da secao, mostrado apagado antes do marcador. */
    index: string
    label: string
    /** Fator de parallax da coluna de cena. */
    stageFactor?: ParallaxFactor
    labelledBy: string
  }>(),
  { stageFactor: PARALLAX.curve },
)

const secao = ref<HTMLElement | null>(null)
const texto = ref<HTMLElement | null>(null)
const palco = ref<HTMLElement | null>(null)

const cena = useScrollScene(secao)

// Camada 4 no texto, e o fator da secao no palco. As duas se registram no
// mesmo gatilho mestre criado acima, e a cena vai na mao porque `inject` nao
// enxerga o `provide` do proprio componente.
useParallaxLayer(texto, PARALLAX.text, cena)
useParallaxLayer(palco, props.stageFactor, cena)
</script>

<template>
  <section ref="secao" class="section" :aria-labelledby="labelledBy">
    <div ref="texto" class="section__text">
      <UiLabel :index="index">{{ label }}</UiLabel>
      <slot name="text" :progress="cena.progress.value" :active="cena.active.value" />
    </div>

    <div ref="palco" class="section__stage">
      <slot name="stage" :progress="cena.progress.value" :active="cena.active.value" />
    </div>
  </section>
</template>
