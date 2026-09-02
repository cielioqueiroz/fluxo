import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, relative } from 'node:path'
import { fileURLToPath } from 'node:url'

import { tokens, type Tokens } from './index.js'

const AVISO = [
  '/*',
  ' * Gerado por packages/tokens. Nao edite este arquivo a mao.',
  ' *',
  ' * A fonte e o TypeScript em packages/tokens/src. Rode `pnpm --filter',
  ' * @fluxo/tokens tokens:emit` depois de mudar um token.',
  ' */',
].join('\n')

/** Converte o objeto de tokens em custom properties CSS. */
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

/**
 * Onde a arvore do AGENTS.md diz que o CSS gerado mora.
 *
 * Resolvido a partir deste modulo, e nao do diretorio de trabalho, para que o
 * script funcione de qualquer lugar do monorepo.
 */
const DESTINO = fileURLToPath(new URL('../../../apps/web/assets/css/tokens.css', import.meta.url))

function main(): void {
  const css = toCss(tokens)
  const conferir = process.argv.includes('--check')

  if (conferir) {
    let atual: string
    try {
      atual = readFileSync(DESTINO, 'utf8')
    } catch {
      console.error(`tokens.css nao existe em ${DESTINO}. Rode tokens:emit.`)
      process.exit(1)
    }
    if (atual.replace(/\r\n/g, '\n') !== css) {
      console.error(
        'tokens.css esta dessincronizado da fonte em packages/tokens/src. Rode tokens:emit.',
      )
      process.exit(1)
    }
    console.warn('tokens.css confere com a fonte.')
    return
  }

  mkdirSync(dirname(DESTINO), { recursive: true })
  writeFileSync(DESTINO, css, 'utf8')
  console.warn(`tokens.css gerado em ${relative(process.cwd(), DESTINO)}`)
}

// So roda como script. Importado por teste, exporta apenas `toCss`.
if (process.argv[1] !== undefined && import.meta.url.endsWith('build.js')) {
  main()
}
