import { type Tokens } from './index.js'

const AVISO = [
  '/*',
  ' * Gerado por packages/tokens. Nao edite este arquivo a mao.',
  ' *',
  ' * A fonte e o TypeScript em packages/tokens/src. Rode `pnpm --filter',
  ' * @fluxo/tokens tokens:emit` depois de mudar um token.',
  ' */',
].join('\n')

/**
 * Converte o objeto de tokens em custom properties CSS.
 *
 * Mora separado de `build.ts` de proposito: aqui e funcao pura e testavel, la e
 * script que escreve arquivo. A cobertura mede esta, e nao a escrita em disco.
 */
export function toCss(t: Tokens): string {
  const linhas: string[] = []

  for (const [nome, valor] of Object.entries(t.color)) {
    linhas.push(`  --color-${nome}: ${valor};`)
  }
  for (const [nome, valor] of Object.entries(t.space)) {
    linhas.push(`  --space-${nome}: ${valor};`)
  }
  linhas.push(`  --radius: ${t.radius};`)

  for (const [nome, valor] of Object.entries(t.typography.families)) {
    linhas.push(`  --font-${nome}: ${valor};`)
  }
  for (const [nome, valor] of Object.entries(t.typography.scale)) {
    linhas.push(`  --text-${nome}: ${valor};`)
  }
  for (const [nome, valor] of Object.entries(t.typography.weights)) {
    linhas.push(`  --weight-${nome}: ${valor};`)
  }

  for (const [nome, valor] of Object.entries(t.motion.durations)) {
    linhas.push(`  --duration-${nome}: ${valor};`)
  }
  for (const [nome, valor] of Object.entries(t.motion.easings)) {
    linhas.push(`  --ease-${nome === 'inOut' ? 'in-out' : nome}: ${valor};`)
  }

  return `${AVISO}\n\n:root {\n${linhas.join('\n')}\n}\n`
}
