import { onBeforeUnmount, onMounted, readonly, ref, type Ref } from 'vue'

/**
 * Preferencia de movimento reduzido do sistema.
 *
 * A secao 5 do AGENTS.md trata isto como requisito de acessibilidade, nao como
 * opcional. Quando verdadeiro, o TresJS nao e montado, o parallax nao e ligado
 * e o Lenis nao assume o scroll. A narrativa continua legivel em estatico,
 * porque a Fase 3 foi construida para funcionar parada.
 *
 * Comeca em `true` de proposito. Durante a renderizacao no servidor nao existe
 * `matchMedia`, e assumir que o usuario quer movimento seria assumir a favor do
 * enfeite. A primeira leitura no cliente corrige.
 */
const preferenciaReduzida = ref(true)
let assinantes = 0
let consulta: MediaQueryList | null = null

function aoMudar(evento: MediaQueryListEvent): void {
  preferenciaReduzida.value = evento.matches
}

export function useReducedMotion(): Readonly<Ref<boolean>> {
  onMounted(() => {
    assinantes += 1
    if (consulta === null) {
      consulta = window.matchMedia('(prefers-reduced-motion: reduce)')
      preferenciaReduzida.value = consulta.matches
      consulta.addEventListener('change', aoMudar)
    }
  })

  onBeforeUnmount(() => {
    assinantes -= 1
    if (assinantes === 0 && consulta !== null) {
      consulta.removeEventListener('change', aoMudar)
      consulta = null
    }
  })

  return readonly(preferenciaReduzida)
}
