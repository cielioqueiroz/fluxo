import { insightResponseSchema, type InsightInput } from '@fluxo/contracts'
import { cents } from '@fluxo/domain'
import { describe, expect, it } from 'vitest'

import { InsightCache } from '../src/modules/insight/insight.cache.js'
import { InsightService } from '../src/modules/insight/insight.service.js'
import { PROMPT_HASH, PROMPT_VERSION } from '../src/modules/insight/prompts/registry.js'
import type { LlmPort, LlmResult } from '../src/modules/llm/llm.port.js'
import { RagService, type RetrievedChunk } from '../src/modules/rag/rag.service.js'
import { RerankService } from '../src/modules/rag/rerank.service.js'
import type { RetrievalService } from '../src/modules/rag/retrieval.service.js'

const resumo: InsightInput = {
  kind: 'loan',
  principal: cents(3000000),
  totalPaid: cents(4496330),
  totalInterest: cents(1496330),
  totalFees: cents(0),
  interestOverPrincipalPercent: 49.9,
  termMonths: 48,
  settled: true,
  neverSettles: false,
  capReachedAtPeriod: null,
  milestones: [{ fraction: 0.5, period: 29, balance: cents(1497513) }],
}

const trecho: RetrievedChunk = {
  id: 'amortizacao-antecipada#0',
  source: 'Banco Central do Brasil, Cidadania Financeira',
  url: 'https://www.bcb.gov.br/cidadaniafinanceira',
  content: 'A amortizacao antecipada reduz o saldo devedor e os juros futuros.',
  similarity: 0.8,
}

const saidaBoa = {
  headline: 'Os juros somam quase metade do valor emprestado',
  reading: 'Voce devolve 44.963,30 por 30.000,00, ao longo de 48 meses.',
  claims: [{ text: 'Antecipar reduz os juros futuros.', citationIndex: 0 }],
  citations: [{ source: trecho.source, url: trecho.url, excerpt: trecho.content }],
}

/** Um modelo de mentira, que devolve o que o teste mandar, na ordem. */
function modeloQueResponde(...respostas: LlmResult[]): LlmPort & { chamadas: number } {
  let indice = 0
  return {
    chamadas: 0,
    isAvailable: () => true,
    embed: () => Promise.resolve(null),
    generate(this: { chamadas: number }): Promise<LlmResult> {
      this.chamadas += 1
      const resposta = respostas[indice] ?? respostas[respostas.length - 1]
      indice += 1
      return Promise.resolve(resposta ?? { ok: false, reason: 'error' })
    },
  }
}

const modeloIndisponivel: LlmPort = {
  isAvailable: () => false,
  embed: () => Promise.resolve(null),
  generate: () => Promise.resolve({ ok: false, reason: 'unavailable' }),
}

/** Sem banco, o cache sempre erra a leitura e nunca escreve. */
const cacheSemBanco = new InsightCache(null)

function ragCom(trechos: readonly RetrievedChunk[]): RagService {
  const busca = { search: () => Promise.resolve(trechos) } as unknown as RetrievalService
  return new RagService(busca, new RerankService())
}

const texto = (valor: unknown): LlmResult => ({ ok: true, text: JSON.stringify(valor) })

describe('InsightService, caminho feliz', () => {
  it('devolve a leitura do modelo, nao degradada', async () => {
    const servico = new InsightService(
      modeloQueResponde(texto(saidaBoa)),
      cacheSemBanco,
      ragCom([trecho]),
    )
    const resposta = await servico.read(resumo)

    expect(resposta.degraded).toBe(false)
    expect(resposta.headline).toBe(saidaBoa.headline)
    expect(resposta.citations).toHaveLength(1)
  })

  it('a resposta bate com o schema de contracts', async () => {
    const servico = new InsightService(
      modeloQueResponde(texto(saidaBoa)),
      cacheSemBanco,
      ragCom([trecho]),
    )
    const conferido = insightResponseSchema.safeParse(await servico.read(resumo))
    expect(conferido.success, JSON.stringify(conferido.error?.issues)).toBe(true)
  })

  it('carrega a versao e o hash do prompt que produziu a saida', async () => {
    const servico = new InsightService(
      modeloQueResponde(texto(saidaBoa)),
      cacheSemBanco,
      ragCom([trecho]),
    )
    const resposta = await servico.read(resumo)
    expect(resposta.promptVersion).toBe(PROMPT_VERSION)
    expect(resposta.promptHash).toBe(PROMPT_HASH)
  })

  it('o aviso educativo e do servidor, e nao do modelo', async () => {
    const semAviso = { ...saidaBoa }
    const servico = new InsightService(
      modeloQueResponde(texto(semAviso)),
      cacheSemBanco,
      ragCom([trecho]),
    )
    expect((await servico.read(resumo)).disclaimer).toContain('Material educativo')
  })

  it('tira a cerca de codigo quando o modelo insiste em usa-la', async () => {
    const comCerca: LlmResult = { ok: true, text: '```json\n' + JSON.stringify(saidaBoa) + '\n```' }
    const servico = new InsightService(modeloQueResponde(comCerca), cacheSemBanco, ragCom([trecho]))
    expect((await servico.read(resumo)).degraded).toBe(false)
  })
})

describe('InsightService, degradacao silenciosa', () => {
  it('sem chave de modelo, degrada sem nem tentar', async () => {
    const servico = new InsightService(modeloIndisponivel, cacheSemBanco, ragCom([]))
    const resposta = await servico.read(resumo)
    expect(resposta.degraded).toBe(true)
    expect(resposta.reading).toBe('')
  })

  it('saida malformada dispara uma segunda tentativa, e so uma', async () => {
    const modelo = modeloQueResponde(
      { ok: true, text: 'isto nao e json' },
      { ok: true, text: 'isto tambem nao e' },
    )
    const servico = new InsightService(modelo, cacheSemBanco, ragCom([trecho]))
    const resposta = await servico.read(resumo)

    expect(modelo.chamadas).toBe(2)
    expect(resposta.degraded).toBe(true)
  })

  it('a segunda tentativa e aproveitada quando ela vem certa', async () => {
    const modelo = modeloQueResponde({ ok: true, text: '{{quebrado' }, texto(saidaBoa))
    const servico = new InsightService(modelo, cacheSemBanco, ragCom([trecho]))
    const resposta = await servico.read(resumo)

    expect(modelo.chamadas).toBe(2)
    expect(resposta.degraded).toBe(false)
    expect(resposta.headline).toBe(saidaBoa.headline)
  })

  it('cota esgotada degrada sem segunda tentativa, para nao gastar o que nao ha', async () => {
    const modelo = modeloQueResponde({ ok: false, reason: 'quota' })
    const servico = new InsightService(modelo, cacheSemBanco, ragCom([trecho]))
    expect((await servico.read(resumo)).degraded).toBe(true)
    expect(modelo.chamadas).toBe(1)
  })

  it('a resposta degradada continua valida pelo schema', async () => {
    const servico = new InsightService(modeloIndisponivel, cacheSemBanco, ragCom([]))
    const conferido = insightResponseSchema.safeParse(await servico.read(resumo))
    expect(conferido.success, JSON.stringify(conferido.error?.issues)).toBe(true)
  })

  it('nunca lanca, mesmo com tudo fora do ar', async () => {
    const modelo = modeloQueResponde({ ok: false, reason: 'error' })
    const servico = new InsightService(modelo, cacheSemBanco, ragCom([]))
    await expect(servico.read(resumo)).resolves.toBeDefined()
  })
})

describe('citacao obrigatoria', () => {
  it('afirmacao com citacao inventada e removida antes de chegar a UI', async () => {
    const inventada = {
      ...saidaBoa,
      citations: [
        {
          source: 'Banco que nao existe',
          url: 'https://exemplo-inventado.com/pagina',
          excerpt: 'trecho que o modelo escreveu sozinho',
        },
      ],
    }
    const servico = new InsightService(
      modeloQueResponde(texto(inventada)),
      cacheSemBanco,
      ragCom([trecho]),
    )
    const resposta = await servico.read(resumo)

    expect(resposta.citations).toHaveLength(0)
    expect(resposta.claims).toHaveLength(0)
  })

  it('mantem a citacao que veio do corpus e descarta a inventada', async () => {
    const misturada = {
      ...saidaBoa,
      claims: [
        { text: 'Verdadeira.', citationIndex: 0 },
        { text: 'Inventada.', citationIndex: 1 },
      ],
      citations: [
        { source: trecho.source, url: trecho.url, excerpt: trecho.content },
        { source: 'Inventado', url: 'https://nao-existe.example/x', excerpt: 'nada' },
      ],
    }
    const servico = new InsightService(
      modeloQueResponde(texto(misturada)),
      cacheSemBanco,
      ragCom([trecho]),
    )
    const resposta = await servico.read(resumo)

    expect(resposta.citations).toHaveLength(1)
    expect(resposta.claims).toHaveLength(1)
    expect(resposta.claims[0]?.text).toBe('Verdadeira.')
    // O indice foi remapeado, e nao deixado apontando para o vazio.
    expect(resposta.claims[0]?.citationIndex).toBe(0)
  })

  it('sem corpus recuperado, a leitura sai sem citacao nenhuma', async () => {
    const semFonte = { ...saidaBoa, claims: [], citations: [] }
    const servico = new InsightService(
      modeloQueResponde(texto(semFonte)),
      cacheSemBanco,
      ragCom([]),
    )
    const resposta = await servico.read(resumo)
    expect(resposta.degraded).toBe(false)
    expect(resposta.citations).toHaveLength(0)
  })
})

describe('cache por hash', () => {
  it('a chave muda quando o cenario muda', () => {
    const cache = new InsightCache(null)
    const outro: InsightInput = { ...resumo, termMonths: 24 }
    expect(cache.key(resumo)).not.toBe(cache.key(outro))
  })

  it('a chave e estavel para o mesmo cenario', () => {
    const cache = new InsightCache(null)
    expect(cache.key(resumo)).toBe(cache.key({ ...resumo }))
  })

  it('a chave e sha256 em hexadecimal', () => {
    expect(new InsightCache(null).key(resumo)).toMatch(/^[0-9a-f]{64}$/)
  })
})
