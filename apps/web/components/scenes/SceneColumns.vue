<script setup lang="ts">
import type { Schedule } from '@fluxo/domain'
import { TresCanvas, useTres } from '@tresjs/core'
import { Color } from 'three'
import { computed, defineComponent, watch } from 'vue'

/**
 * Camada 2, as parcelas em 3D.
 *
 * Le exatamente os mesmos numeros que o SVG da Fase 3 lia: cada coluna e uma
 * parcela, a altura e o pagamento, e a parte de baixo sao os encargos. O 3D nao
 * acrescenta informacao, acrescenta profundidade, que e o que faz o fator 0.4
 * de parallax ter o que separar da camada de texto.
 *
 * O modo de render e `on-demand`. Nada e desenhado enquanto o progresso da
 * secao nao muda, e o progresso so muda quando a secao esta na viewport. E
 * assim que o loop para quando a cena sai da tela, sem destruir o contexto
 * WebGL a cada rolagem.
 */
const props = defineProps<{ schedule: Schedule; progress: number }>()

const LARGURA_CENA = 12
const ALTURA_MAXIMA = 5

const colunas = computed(() => {
  const linhas = props.schedule.installments
  if (linhas.length === 0) {
    return []
  }
  const maior = Math.max(...linhas.map((l) => l.payment), 1)
  const passo = LARGURA_CENA / linhas.length
  const largura = Math.max(0.02, passo * 0.62)

  return linhas.map((linha, indice) => {
    const alturaTotal = (linha.payment / maior) * ALTURA_MAXIMA
    const alturaEncargo = ((linha.interest + linha.fees) / maior) * ALTURA_MAXIMA
    const x = -LARGURA_CENA / 2 + passo * (indice + 0.5)
    return {
      key: linha.period,
      x,
      largura,
      alturaTotal,
      alturaEncargo,
      // A base de cada barra assenta no zero do plano.
      yTotal: alturaTotal / 2,
      yEncargo: alturaEncargo / 2,
    }
  })
})

/**
 * Redesenha sob demanda.
 *
 * Vive em um componente filho porque `useTres` so existe dentro do contexto do
 * canvas. E o unico jeito de pedir um quadro sem manter um loop girando.
 */
const Invalidador = defineComponent({
  name: 'SceneColumnsInvalidator',
  props: { progress: { type: Number, required: true } },
  setup(propsFilho) {
    // Anotado na mao porque o tipo de `useTres` nao resolve pela fronteira do
    // pacote, e a analise por tipo do ESLint recusa chamada de tipo nao
    // resolvido. O contrato usado aqui e uma funcao sem argumento.
    const { invalidate } = useTres() as { invalidate: () => void }
    watch(
      () => propsFilho.progress,
      () => {
        invalidate()
      },
      { immediate: true },
    )
    // Nao desenha nada: existe so para pedir quadro quando o progresso muda.
    return () => null
  },
})

const corEncargo = new Color('#C4552F')
const corPrincipal = new Color('#3D3D3D')
</script>

<template>
  <div class="columns" aria-hidden="true">
    <TresCanvas render-mode="on-demand" :alpha="true" :dpr="[1, 1.75]">
      <TresPerspectiveCamera :position-x="0" :position-y="3.2" :position-z="11" :fov="38" />
      <TresAmbientLight :intensity="1.6" />
      <TresDirectionalLight :position-x="4" :position-y="8" :position-z="6" :intensity="1.1" />

      <Invalidador :progress="progress" />

      <TresGroup :rotation-y="-0.32" :position-y="-1.4">
        <TresMesh
          v-for="coluna in colunas"
          :key="coluna.key"
          :position-x="coluna.x"
          :position-y="coluna.yTotal"
        >
          <TresBoxGeometry :args="[coluna.largura, coluna.alturaTotal, coluna.largura]" />
          <TresMeshStandardMaterial :color="corPrincipal" :roughness="0.85" :metalness="0" />
        </TresMesh>

        <TresMesh
          v-for="coluna in colunas"
          :key="`encargo-${coluna.key}`"
          :position-x="coluna.x"
          :position-y="coluna.yEncargo"
          :position-z="0.001"
        >
          <TresBoxGeometry
            :args="[coluna.largura * 1.02, coluna.alturaEncargo, coluna.largura * 1.02]"
          />
          <TresMeshStandardMaterial :color="corEncargo" :roughness="0.7" :metalness="0" />
        </TresMesh>
      </TresGroup>
    </TresCanvas>
  </div>
</template>

<style scoped>
.columns {
  block-size: clamp(260px, 46vh, 460px);
  contain: content;
}
</style>
