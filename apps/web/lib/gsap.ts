import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import Lenis from 'lenis'

/**
 * Registro central do runtime de movimento.
 *
 * A secao 5 do AGENTS.md exige que o Lenis seja dono do scroll, que o GSAP leia
 * o progresso dele, e que nao exista nenhum listener proprio de `scroll` no
 * projeto. Este arquivo e o unico lugar onde essas tres coisas se conhecem.
 *
 * Nada aqui roda no servidor, e nada roda quando o usuario pede movimento
 * reduzido: quem chama `setupMotion` ja verificou.
 */

let lenis: Lenis | null = null
let aoQuadro: ((tempo: number) => void) | null = null
let pronto = false

export function setupMotion(): void {
  if (pronto || !import.meta.client) {
    return
  }

  gsap.registerPlugin(ScrollTrigger)

  lenis = new Lenis({
    // Amortecimento curto. A pagina e uma narrativa, nao um carrossel: o scroll
    // precisa parecer pesado sem parecer preso.
    lerp: 0.12,
    wheelMultiplier: 1,
    smoothWheel: true,
    // Toque no telefone continua nativo. Roubar o scroll tatil piora tudo.
    syncTouch: false,
    // Sem isto, o link de pular para a narrativa salta por scroll nativo, o
    // Lenis nao emite evento e o ScrollTrigger fica com o progresso velho.
    anchors: true,
  })

  // O GSAP le o progresso do Lenis. O caminho contrario nao existe.
  // Arrow em vez de passar o metodo solto: o ESLint reclama, com razao, de
  // metodo desacoplado do objeto dono.
  lenis.on('scroll', () => {
    ScrollTrigger.update()
  })

  aoQuadro = (tempo: number): void => {
    lenis?.raf(tempo * 1000)
  }
  gsap.ticker.add(aoQuadro)
  // Sem suavizacao de atraso: um quadro perdido nao deve virar salto.
  gsap.ticker.lagSmoothing(0)

  pronto = true
}

export function teardownMotion(): void {
  if (!pronto) {
    return
  }
  if (aoQuadro !== null) {
    gsap.ticker.remove(aoQuadro)
    aoQuadro = null
  }
  lenis?.destroy()
  lenis = null
  ScrollTrigger.getAll().forEach((gatilho) => {
    gatilho.kill()
  })
  pronto = false
}

/** Verdadeiro depois que o runtime foi ligado. Usado por teste e por guarda. */
export function motionIsReady(): boolean {
  return pronto
}

export { gsap, ScrollTrigger }
