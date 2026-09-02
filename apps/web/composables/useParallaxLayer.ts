import { onBeforeUnmount, onMounted, type Ref } from 'vue'

import { gsap } from '~~/lib/gsap'
import { useReducedMotion } from './useReducedMotion'
import { useSceneContext, type ScrollScene } from './useScrollScene'

/**
 * Fator de parallax de cada camada, conforme a tabela da secao 5 do AGENTS.md.
 *
 * O fator e a velocidade da camada em relacao ao scroll. 1.0 anda junto com a
 * pagina e nao ganha deslocamento nenhum. 0.1 quase nao anda, entao ganha o
 * maior deslocamento contrario. E por isso que o deslocamento e proporcional a
 * `1 - fator`.
 */
export const PARALLAX = {
  /** Camada 1, o ruido de fundo. */
  noise: 0.1,
  /** Camada 2, as colunas de parcelas em 3D. */
  columns: 0.4,
  /** Camada 3, a curva de juros. */
  curve: 0.8,
  /** Camada 4, texto e labels. Anda com a pagina. */
  text: 1,
} as const

export type ParallaxFactor = (typeof PARALLAX)[keyof typeof PARALLAX]

/** Deslocamento maximo, em pixels, de uma camada totalmente parada. */
const AMPLITUDE = 160

/**
 * Registra um elemento como camada de parallax da secao em que ele vive.
 *
 * Anima apenas `transform`, via `quickSetter`, que escreve direto na
 * propriedade sem recriar objetos a cada quadro. Nenhum `top`, `left`, `width`
 * ou `height` e tocado, e nenhum listener de `scroll` e criado: o progresso vem
 * do gatilho mestre da secao.
 */
export function useParallaxLayer(
  alvo: Ref<HTMLElement | null>,
  fator: ParallaxFactor,
  /**
   * A cena em que a camada se registra.
   *
   * Existe como parametro, e nao apenas como `inject`, porque no Vue um
   * componente nao enxerga o proprio `provide`: `inject` resolve a partir do
   * pai. O `SceneStage` cria a cena e tambem registra duas camadas nela, entao
   * ele precisa passar a referencia na mao. Componentes filhos continuam
   * achando a cena sozinhos.
   */
  cena: ScrollScene | null = useSceneContext(),
  amplitude: number = AMPLITUDE,
): void {
  const movimentoReduzido = useReducedMotion()
  let cancelar: (() => void) | null = null

  onMounted(() => {
    if (movimentoReduzido.value || cena === null || alvo.value === null) {
      return
    }

    const escrever = gsap.quickSetter(alvo.value, 'y', 'px') as (valor: number) => void
    const alcance = amplitude * (1 - fator)

    cancelar = cena.registerLayer((progresso) => {
      // Centrado em zero: a camada chega a secao adiantada e sai atrasada, em
      // vez de comecar deslocada e so voltar ao lugar no fim.
      escrever((progresso - 0.5) * alcance)
    })
  })

  onBeforeUnmount(() => {
    cancelar?.()
    cancelar = null
    if (alvo.value !== null) {
      gsap.set(alvo.value, { clearProps: 'transform' })
    }
  })
}
