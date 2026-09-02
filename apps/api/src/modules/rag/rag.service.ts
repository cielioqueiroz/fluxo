import type { InsightInput, InsightModelOutput } from '@fluxo/contracts'
import { Injectable } from '@nestjs/common'

import { RerankService } from './rerank.service.js'
import { RetrievalService, type RetrievedChunk } from './retrieval.service.js'

export type { RetrievedChunk }

/**
 * A fachada do RAG.
 *
 * Existe para que o modulo de insight nao precise conhecer busca vetorial,
 * reordenamento e regra de citacao separadamente. Ela e o unico lugar que sabe
 * transformar um resumo em consulta e um conjunto de trechos em citacao.
 */
@Injectable()
export class RagService {
  constructor(
    private readonly retrieval: RetrievalService,
    private readonly rerank: RerankService,
  ) {}

  /**
   * Monta a consulta a partir do cenario, e nao a partir de texto do usuario.
   *
   * O usuario nao escreve nada nesta pagina: ele preenche quatro campos. A
   * consulta e derivada do que o calculo produziu, e por isso ela e estavel e
   * cacheavel junto com o resto.
   */
  async retrieve(resumo: InsightInput): Promise<readonly RetrievedChunk[]> {
    const consulta = this.consultaPara(resumo)
    const candidatos = await this.retrieval.search(consulta)
    return this.rerank.rank(consulta, candidatos)
  }

  /** Formata os trechos como o prompt espera, numerados para virar indice. */
  format(trechos: readonly RetrievedChunk[]): string {
    return trechos
      .map(
        (trecho, indice) =>
          `[${String(indice)}] ${trecho.source} (${trecho.url})\n${trecho.content}`,
      )
      .join('\n\n')
  }

  /**
   * Remove afirmacao sem chunk correspondente.
   *
   * A secao 6 do AGENTS.md exige isto com todas as letras. O schema de contratos
   * ja garante que o indice aponta para uma citacao existente; o que falta e
   * garantir que a citacao veio do corpus, e nao da imaginacao do modelo.
   *
   * A checagem e pela URL: se o modelo inventou uma fonte que nao estava entre
   * os trechos recuperados, a citacao cai, e toda afirmacao que dependia dela
   * cai junto.
   */
  dropUngroundedClaims(
    saida: InsightModelOutput,
    trechos: readonly RetrievedChunk[],
  ): InsightModelOutput {
    const urlsReais = new Set(trechos.map((trecho) => trecho.url))

    const mantidas: InsightModelOutput['citations'] = []
    const novoIndice = new Map<number, number>()

    for (const [indice, citacao] of saida.citations.entries()) {
      if (urlsReais.has(citacao.url)) {
        novoIndice.set(indice, mantidas.length)
        mantidas.push(citacao)
      }
    }

    const afirmacoes = saida.claims
      .filter((afirmacao) => novoIndice.has(afirmacao.citationIndex))
      .map((afirmacao) => ({
        ...afirmacao,
        citationIndex: novoIndice.get(afirmacao.citationIndex) ?? 0,
      }))

    return { ...saida, claims: afirmacoes, citations: mantidas }
  }

  private consultaPara(resumo: InsightInput): string {
    const partes: string[] = ['juros', 'amortizacao', 'divida']

    if (resumo.kind === 'card') {
      partes.push('cartao de credito', 'rotativo', 'parcelamento de fatura', 'pagamento minimo')
    } else {
      partes.push('financiamento', 'emprestimo', 'amortizacao antecipada', 'portabilidade')
    }
    if (resumo.neverSettles) {
      partes.push('divida que nao quita', 'juros sobre juros')
    }
    if (resumo.capReachedAtPeriod !== null) {
      partes.push('limite de juros e encargos', 'teto do rotativo')
    }
    if (resumo.totalFees > 0) {
      partes.push('IOF', 'encargos')
    }
    return partes.join(' ')
  }
}
