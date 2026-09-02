import {
  inject,
  onBeforeUnmount,
  onMounted,
  provide,
  readonly,
  ref,
  type InjectionKey,
  type Ref,
} from 'vue'

import { ScrollTrigger, setupMotion } from '~~/lib/gsap'
import { useReducedMotion } from './useReducedMotion'

/** Recebe o progresso da secao, de 0 a 1, uma vez por quadro. */
export type LayerHandler = (progress: number) => void

export interface ScrollScene {
  readonly progress: Readonly<Ref<number>>
  readonly active: Readonly<Ref<boolean>>
  /** Registra uma camada no gatilho mestre. Devolve como cancelar. */
  readonly registerLayer: (handler: LayerHandler) => () => void
}

export const SCROLL_SCENE = Symbol('fluxo:scroll-scene') as InjectionKey<ScrollScene>

/**
 * Um unico ScrollTrigger mestre por secao.
 *
 * A secao 5 do AGENTS.md e explicita: um gatilho por secao, e as camadas se
 * registram nele. Nao existe um ScrollTrigger por camada, porque quatro
 * gatilhos por secao seriam quatro leituras de layout por quadro para produzir
 * o mesmo numero.
 *
 * O `will-change` entra quando a secao fica ativa e sai quando ela sai. Deixar
 * `will-change: transform` permanente em seis secoes obriga o navegador a
 * manter seis camadas de composicao vivas o tempo todo, que e o oposto de
 * otimizar.
 */
export function useScrollScene(alvo: Ref<HTMLElement | null>): ScrollScene {
  const progress = ref(0)
  const active = ref(false)
  const camadas = new Set<LayerHandler>()
  const movimentoReduzido = useReducedMotion()

  let gatilho: ScrollTrigger | null = null

  const registerLayer = (handler: LayerHandler): (() => void) => {
    camadas.add(handler)
    // Entrega o estado atual na hora, para a camada nascer no lugar certo em
    // vez de saltar no primeiro quadro de scroll.
    handler(progress.value)
    return () => camadas.delete(handler)
  }

  onMounted(() => {
    if (movimentoReduzido.value) {
      return
    }
    const elemento = alvo.value
    if (elemento === null) {
      return
    }

    setupMotion()

    gatilho = ScrollTrigger.create({
      trigger: elemento,
      start: 'top bottom',
      end: 'bottom top',
      onUpdate: (self) => {
        progress.value = self.progress
        for (const camada of camadas) {
          camada(self.progress)
        }
      },
      onToggle: (self) => {
        active.value = self.isActive
        elemento.style.willChange = self.isActive ? 'transform' : ''
      },
    })
  })

  onBeforeUnmount(() => {
    gatilho?.kill()
    gatilho = null
    camadas.clear()
    if (alvo.value !== null) {
      alvo.value.style.willChange = ''
    }
  })

  const cena: ScrollScene = {
    progress: readonly(progress),
    active: readonly(active),
    registerLayer,
  }

  provide(SCROLL_SCENE, cena)
  return cena
}

/** Usado pelas camadas para achar o gatilho mestre da secao em que vivem. */
export function useSceneContext(): ScrollScene | null {
  return inject(SCROLL_SCENE, null)
}
