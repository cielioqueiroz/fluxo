import { onMounted, readonly, ref, type Ref } from 'vue'

/**
 * Se este navegador consegue criar um contexto WebGL.
 *
 * Existe por causa de um defeito encontrado pelo Lighthouse: rodando o Chrome
 * com `--disable-gpu`, o TresJS falhava ao criar o contexto, o erro subia
 * durante a hidratacao e o Nuxt trocava a pagina inteira pela tela de erro.
 * Quem tem GPU na lista de bloqueio do navegador, WebGL desligado, ou roda em
 * maquina virtual perdia a narrativa toda por causa de um campo de ruido
 * decorativo.
 *
 * A deteccao acontece uma vez, antes de qualquer canvas montar, e o resultado
 * entra na mesma decisao que ja existia para movimento reduzido. O caminho de
 * fallback nao e novo: sao os graficos estaticos da Fase 3.
 *
 * Comeca em `false` porque no servidor nao ha canvas, e assumir suporte faria o
 * HTML inicial prometer uma cena que talvez nunca monte.
 */
const suportado = ref(false)
let verificado = false

function detectar(): boolean {
  try {
    const canvas = document.createElement('canvas')
    const contexto = canvas.getContext('webgl2') ?? canvas.getContext('webgl')
    if (contexto === null) {
      return false
    }
    // Devolve o contexto de teste em vez de deixa-lo ocupando um dos poucos
    // que o navegador permite por pagina.
    const perder = contexto.getExtension('WEBGL_lose_context')
    perder?.loseContext()
    return true
  } catch {
    return false
  }
}

export function useWebgl(): Readonly<Ref<boolean>> {
  onMounted(() => {
    if (!verificado) {
      verificado = true
      suportado.value = detectar()
    }
  })
  return readonly(suportado)
}
