/**
 * Reparte um documento em pedacos para o RAG.
 *
 * Reparte por paragrafo, e nao por contagem de caractere cega. Material de
 * educacao financeira e escrito em paragrafos curtos e autocontidos, entao
 * cortar no meio de um produz trecho que nao sustenta afirmacao nenhuma, e a
 * secao 6 do AGENTS.md exige que toda afirmacao tenha chunk correspondente.
 */

export interface ChunkInput {
  readonly documentId: string
  readonly source: string
  readonly url: string
  readonly text: string
}

export interface Chunk {
  readonly id: string
  readonly documentId: string
  readonly source: string
  readonly url: string
  readonly position: number
  readonly content: string
}

/** Abaixo disso o trecho nao sustenta nada, acima disso ele carrega ruido. */
const MINIMO = 180
const MAXIMO = 1200

export function chunkDocument(entrada: ChunkInput): readonly Chunk[] {
  const paragrafos = entrada.text
    .replace(/\r\n/g, '\n')
    .split(/\n{2,}/)
    .map((p) => p.replace(/\s+/g, ' ').trim())
    .filter((p) => p !== '')

  const pedacos: string[] = []
  let atual = ''

  for (const paragrafo of paragrafos) {
    // Paragrafo sozinho ja grande demais vira pedaco proprio, cortado em frase.
    if (paragrafo.length > MAXIMO) {
      if (atual !== '') {
        pedacos.push(atual)
        atual = ''
      }
      pedacos.push(...partirEmFrases(paragrafo))
      continue
    }

    const candidato = atual === '' ? paragrafo : `${atual}\n\n${paragrafo}`
    if (candidato.length > MAXIMO) {
      pedacos.push(atual)
      atual = paragrafo
    } else {
      atual = candidato
    }
  }
  if (atual !== '') {
    pedacos.push(atual)
  }

  return pedacos
    .filter((conteudo) => conteudo.length >= MINIMO)
    .map((conteudo, indice) => ({
      id: `${entrada.documentId}#${String(indice)}`,
      documentId: entrada.documentId,
      source: entrada.source,
      url: entrada.url,
      position: indice,
      content: conteudo,
    }))
}

function partirEmFrases(texto: string): string[] {
  const frases = texto.split(/(?<=[.!?])\s+/)
  const saida: string[] = []
  let atual = ''

  for (const frase of frases) {
    const candidato = atual === '' ? frase : `${atual} ${frase}`
    if (candidato.length > MAXIMO && atual !== '') {
      saida.push(atual)
      atual = frase
    } else {
      atual = candidato
    }
  }
  if (atual !== '') {
    saida.push(atual)
  }
  return saida
}
