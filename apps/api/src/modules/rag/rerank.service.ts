import { Injectable } from '@nestjs/common'

import type { RetrievedChunk } from './retrieval.service.js'

/** Quantos trechos chegam ao prompt depois do reordenamento. */
const FINAIS = 3

/**
 * Reordena os candidatos antes de mandar ao modelo.
 *
 * **Reordenamento lexical, e nao um segundo modelo.** Um reranker cruzado seria
 * mais preciso e custaria uma chamada de inferencia por consulta, o que sai da
 * cota gratuita que a regra 1 do AGENTS.md exige respeitar. Este aqui e barato,
 * roda em memoria, e resolve o problema que a busca vetorial sozinha tem:
 * trechos com significado parecido mas sem os termos que importam.
 *
 * Tres sinais, somados:
 *
 * 1. A similaridade que o pgvector ja calculou, que continua sendo a base
 * 2. Quantos termos da consulta aparecem literalmente no trecho, porque numero
 *    e nome de norma precisam bater ao pe da letra
 * 3. Uma penalidade para trechos muito longos, que tendem a casar com tudo e
 *    sustentar pouco
 */
@Injectable()
export class RerankService {
  rank(consulta: string, candidatos: readonly RetrievedChunk[]): readonly RetrievedChunk[] {
    const termos = this.termos(consulta)

    const pontuados = candidatos.map((candidato) => {
      const texto = candidato.content.toLowerCase()
      const encontrados = termos.filter((termo) => texto.includes(termo)).length
      const cobertura = termos.length === 0 ? 0 : encontrados / termos.length

      // Trecho perto de 600 caracteres e o alvo. Muito curto nao sustenta,
      // muito longo dilui.
      const tamanho = candidato.content.length
      const penalidade = tamanho > 900 ? (tamanho - 900) / 4000 : 0

      const nota = candidato.similarity * 0.6 + cobertura * 0.4 - penalidade
      return { candidato, nota }
    })

    return pontuados
      .sort((a, b) => b.nota - a.nota)
      .slice(0, FINAIS)
      .map((item) => item.candidato)
  }

  /** Termos com significado, sem as palavras que aparecem em qualquer texto. */
  private termos(consulta: string): readonly string[] {
    const vazias = new Set([
      'de',
      'da',
      'do',
      'das',
      'dos',
      'em',
      'no',
      'na',
      'para',
      'por',
      'com',
      'que',
      'uma',
      'um',
      'os',
      'as',
      'ao',
      'sobre',
      'e',
      'o',
      'a',
    ])
    return [...new Set(consulta.toLowerCase().match(/[\p{L}\p{N}]{3,}/gu) ?? [])].filter(
      (termo) => !vazias.has(termo),
    )
  }
}
