import { describe, expect, it } from 'vitest'

import { chunkDocument } from '../src/modules/rag/chunking.js'
import { CORPUS } from '../src/modules/rag/ingest/corpus.js'
import { RerankService } from '../src/modules/rag/rerank.service.js'
import type { RetrievedChunk } from '../src/modules/rag/retrieval.service.js'

describe('chunkDocument', () => {
  const documento = {
    documentId: 'teste',
    source: 'Fonte de teste',
    url: 'https://exemplo.test/doc',
    text: `${'Primeiro paragrafo com conteudo suficiente para sustentar uma afirmacao. '.repeat(4)}

${'Segundo paragrafo, tambem longo o bastante para virar um pedaco proprio. '.repeat(4)}`,
  }

  it('reparte por paragrafo e carrega fonte e URL em cada pedaco', () => {
    const pedacos = chunkDocument(documento)
    expect(pedacos.length).toBeGreaterThan(0)
    for (const pedaco of pedacos) {
      expect(pedaco.url).toBe(documento.url)
      expect(pedaco.source).toBe(documento.source)
    }
  })

  it('da id estavel, para a ingestao poder retomar de onde parou', () => {
    expect(chunkDocument(documento).map((p) => p.id)).toEqual(
      chunkDocument(documento).map((p) => p.id),
    )
    expect(chunkDocument(documento)[0]?.id).toBe('teste#0')
  })

  it('descarta pedaco curto demais para sustentar afirmacao', () => {
    const curto = { ...documento, text: 'Frase curta.' }
    expect(chunkDocument(curto)).toHaveLength(0)
  })

  it('parte paragrafo gigante em frases, em vez de cortar no meio de uma', () => {
    const gigante = { ...documento, text: 'Uma frase completa aqui. '.repeat(120) }
    const pedacos = chunkDocument(gigante)
    expect(pedacos.length).toBeGreaterThan(1)
    for (const pedaco of pedacos) {
      expect(pedaco.content.trimEnd().endsWith('.')).toBe(true)
    }
  })

  it('documento vazio nao gera pedaco', () => {
    expect(chunkDocument({ ...documento, text: '   \n\n  ' })).toHaveLength(0)
  })
})

describe('o corpus versionado', () => {
  it('todo documento tem fonte e URL, porque citacao inventada e proibida', () => {
    for (const documento of CORPUS) {
      expect(documento.source.length).toBeGreaterThan(0)
      expect(documento.url).toMatch(/^https:\/\//)
      expect(documento.documentId).toMatch(/^[a-z0-9-]+$/)
    }
  })

  it('nao ha documentId repetido, que colidiria os ids dos pedacos', () => {
    const ids = CORPUS.map((documento) => documento.documentId)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('todo documento produz pelo menos um pedaco', () => {
    for (const documento of CORPUS) {
      expect(chunkDocument(documento).length, documento.documentId).toBeGreaterThan(0)
    }
  })

  it('cobre as duas regras brasileiras que o dominio implementa', () => {
    const tudo = CORPUS.map((documento) => documento.text)
      .join(' ')
      .toLowerCase()
    expect(tudo).toContain('rotativo')
    expect(tudo).toContain('cem por cento')
  })
})

describe('RerankService', () => {
  const rerank = new RerankService()

  const chunk = (id: string, content: string, similarity: number): RetrievedChunk => ({
    id,
    source: 'Fonte',
    url: `https://exemplo.test/${id}`,
    content,
    similarity,
  })

  it('devolve no maximo tres trechos', () => {
    const candidatos = Array.from({ length: 10 }, (_, i) =>
      chunk(String(i), 'texto qualquer sobre juros', 0.5),
    )
    expect(rerank.rank('juros', candidatos)).toHaveLength(3)
  })

  it('sobe o trecho que traz os termos da consulta, mesmo com similaridade menor', () => {
    const generico = chunk('generico', 'Um texto sobre dinheiro em geral.', 0.75)
    const especifico = chunk('especifico', 'O rotativo do cartao dura um ciclo apenas.', 0.6)

    const ordenado = rerank.rank('rotativo cartao ciclo', [generico, especifico])
    expect(ordenado[0]?.id).toBe('especifico')
  })

  it('penaliza trecho longo demais, que casa com tudo e sustenta pouco', () => {
    const curto = chunk('curto', 'O rotativo dura um ciclo.', 0.7)
    const longo = chunk(
      'longo',
      `O rotativo dura um ciclo. ${'texto de enchimento. '.repeat(200)}`,
      0.7,
    )

    expect(rerank.rank('rotativo ciclo', [longo, curto])[0]?.id).toBe('curto')
  })

  it('lista vazia continua vazia', () => {
    expect(rerank.rank('qualquer coisa', [])).toEqual([])
  })

  it('consulta so com palavras vazias nao quebra a ordenacao', () => {
    const a = chunk('a', 'Conteudo A com tamanho suficiente para o teste.', 0.9)
    const b = chunk('b', 'Conteudo B com tamanho suficiente para o teste.', 0.5)
    expect(rerank.rank('de da do em', [b, a])[0]?.id).toBe('a')
  })
})
