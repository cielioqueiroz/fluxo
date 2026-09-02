import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, relative } from 'node:path'
import { fileURLToPath } from 'node:url'

import { toCss } from './css.js'
import { tokens } from './index.js'

/**
 * Onde a arvore do AGENTS.md diz que o CSS gerado mora.
 *
 * Resolvido a partir deste modulo, e nao do diretorio de trabalho, para que o
 * script funcione de qualquer lugar do monorepo.
 */
const DESTINO = fileURLToPath(new URL('../../../apps/web/assets/css/tokens.css', import.meta.url))

const css = toCss(tokens)

if (process.argv.includes('--check')) {
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
} else {
  mkdirSync(dirname(DESTINO), { recursive: true })
  writeFileSync(DESTINO, css, 'utf8')
  console.warn(`tokens.css gerado em ${relative(process.cwd(), DESTINO)}`)
}
