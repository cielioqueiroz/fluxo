import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

/**
 * Registro de prompts versionados.
 *
 * A secao 6 do AGENTS.md exige que os prompts vivam em arquivos `.md` com
 * versao no nome, e que o hash seja persistido junto do insight gerado, para
 * rastrear qual versao produziu qual saida.
 *
 * Os arquivos sao lidos uma vez, na inicializacao, e o hash e calculado do
 * conteudo. Trocar uma virgula no prompt muda o hash, o que invalida o cache
 * sozinho: nao existe caminho em que uma resposta velha seja servida por um
 * prompt novo.
 */

export interface PromptVersion {
  readonly name: string
  readonly version: string
  readonly content: string
  /** sha256 do conteudo, em hexadecimal. */
  readonly hash: string
}

function carregar(arquivo: string, name: string, version: string): PromptVersion {
  const caminho = fileURLToPath(new URL(arquivo, import.meta.url))
  const content = readFileSync(caminho, 'utf8').replace(/\r\n/g, '\n')
  return {
    name,
    version,
    content,
    hash: createHash('sha256').update(content).digest('hex'),
  }
}

export const SYSTEM_PROMPT = carregar('./system.v1.md', 'system', 'v1')
export const INSIGHT_PROMPT = carregar('./insight.v1.md', 'insight', 'v1')

/**
 * Hash combinado das duas partes.
 *
 * O cache usa este valor, e nao o hash de um arquivo so: mudar apenas a
 * instrucao de sistema tambem muda a saida, entao tambem precisa invalidar.
 */
export const PROMPT_HASH = createHash('sha256')
  .update(SYSTEM_PROMPT.hash)
  .update(INSIGHT_PROMPT.hash)
  .digest('hex')

export const PROMPT_VERSION = `${SYSTEM_PROMPT.name}.${SYSTEM_PROMPT.version}+${INSIGHT_PROMPT.name}.${INSIGHT_PROMPT.version}`

/** Preenche os marcadores do prompt de insight. */
export function renderInsightPrompt(resumo: unknown, fontes: string): string {
  return INSIGHT_PROMPT.content
    .replace('{{RESUMO}}', JSON.stringify(resumo, null, 2))
    .replace(
      '{{FONTES}}',
      fontes === '' ? 'Nenhum trecho de fonte foi recuperado para este cenario.' : fontes,
    )
}
