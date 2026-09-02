<script setup lang="ts">
import { TresCanvas } from '@tresjs/core'
import { Color, Vector2, type ShaderMaterial } from 'three'
import { onBeforeUnmount, onMounted, ref, shallowRef } from 'vue'

import fragmentShader from '~~/assets/shaders/noise.frag?raw'
import vertexShader from '~~/assets/shaders/noise.vert?raw'
import { gsap, setupMotion } from '~~/lib/gsap'

/**
 * Camada 1, o campo de ruido de fundo.
 *
 * Fica fixo atras de tudo e quase nao se move: fator 0.1 na tabela da secao 5.
 *
 * O parallax desta camada acontece dentro do shader, somando o progresso na
 * coordenada do ruido, e nao com um `transform` no canvas. O conteudo e
 * procedural: deslocar o elemento seria mover um retangulo cheio de pixels para
 * simular o que uma soma no fragmento ja faz, e ainda exigiria um canvas maior
 * que a viewport para nao descobrir borda.
 *
 * O loop de render para quando a aba fica oculta. Enquanto ela esta visivel
 * este e o unico canvas que desenha continuamente, e ele desenha um quad de
 * tela cheia com quatro oitavas de ruido, que e barato.
 */
const material = shallowRef<ShaderMaterial | null>(null)
const visivel = ref(false)

/** Progresso da pagina inteira, alimentado pelo ticker. */
const progresso = ref(0)

/** Le a cor do token, para nenhum valor cru de cor viver dentro do componente. */
function corDoToken(nome: string, reserva: string): Color {
  if (!import.meta.client) {
    return new Color(reserva)
  }
  const valor = getComputedStyle(document.documentElement).getPropertyValue(nome).trim()
  return new Color(valor === '' ? reserva : valor)
}

const uniforms = {
  uTime: { value: 0 },
  uProgress: { value: 0 },
  uResolution: { value: new Vector2(1, 1) },
  uBase: { value: new Color('#0A0A0A') },
  uRaised: { value: new Color('#141414') },
}

let aoQuadro: ((tempo: number) => void) | null = null

function aoMudarVisibilidade(): void {
  visivel.value = document.visibilityState === 'visible'
}

function medir(): void {
  uniforms.uResolution.value.set(window.innerWidth, window.innerHeight)
}

onMounted(() => {
  uniforms.uBase.value = corDoToken('--color-bg-base', '#0A0A0A')
  uniforms.uRaised.value = corDoToken('--color-bg-raised', '#141414')
  medir()
  aoMudarVisibilidade()

  window.addEventListener('resize', medir, { passive: true })
  document.addEventListener('visibilitychange', aoMudarVisibilidade)

  setupMotion()

  /*
   * O progresso da pagina e lido dentro do ticker, e nao por um ScrollTrigger.
   *
   * O ruido e fixo e nao pertence a secao nenhuma, entao um gatilho so para ele
   * seria um gatilho a mais para produzir um numero que uma subtracao ja da. A
   * regra da secao 5 proibe listener proprio de `scroll`, e nao existe nenhum
   * aqui: e uma leitura por quadro, dentro do laco que ja estava girando.
   */
  aoQuadro = (tempo: number): void => {
    const percorrivel = document.documentElement.scrollHeight - window.innerHeight
    const p = percorrivel > 0 ? Math.min(1, Math.max(0, window.scrollY / percorrivel)) : 0
    progresso.value = p

    uniforms.uTime.value = tempo
    uniforms.uProgress.value = p
  }
  gsap.ticker.add(aoQuadro)
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', medir)
  document.removeEventListener('visibilitychange', aoMudarVisibilidade)
  if (aoQuadro !== null) {
    gsap.ticker.remove(aoQuadro)
    aoQuadro = null
  }
  material.value?.dispose()
})
</script>

<template>
  <div class="noise" aria-hidden="true">
    <TresCanvas v-if="visivel" :alpha="false" clear-color="#0A0A0A" :dpr="[1, 1.5]">
      <TresMesh :frustum-culled="false">
        <TresPlaneGeometry :args="[2, 2]" />
        <TresShaderMaterial
          ref="material"
          :vertex-shader="vertexShader"
          :fragment-shader="fragmentShader"
          :uniforms="uniforms"
          :depth-test="false"
          :depth-write="false"
        />
      </TresMesh>
    </TresCanvas>
  </div>
</template>

<style scoped>
/*
 * Fixo, atras de tudo, e fora do fluxo. Nao participa de layout, entao nao
 * pode causar deslocamento cumulativo: e uma das razoes de o CLS ficar baixo.
 */
.noise {
  position: fixed;
  inset: 0;
  z-index: 0;
  pointer-events: none;
  contain: strict;
}
</style>
