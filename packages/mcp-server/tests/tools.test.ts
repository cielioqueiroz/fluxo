import { price, rate } from '@fluxo/domain'
import { describe, expect, it } from 'vitest'

import { buscarNorma, buscarNormaSchema } from '../src/tools/buscar-norma.js'
import { compararCenarios, compararCenariosSchema } from '../src/tools/comparar-cenarios.js'
import {
  paraCentavos,
  simularFinanciamento,
  simularFinanciamentoSchema,
} from '../src/tools/simular-financiamento.js'

/**
 * Teste de contrato de cada tool.
 *
 * O que mais importa aqui nao e o formato, e a identidade: a tool precisa
 * devolver exatamente o que o dominio devolve, porque o servidor MCP nao pode
 * ter calculo proprio.
 */

describe('paraCentavos', () => {
  it('converte pelos digitos, e nao multiplicando por cem', () => {
    // 0.1 * 100 da 10.000000000000002 em ponto flutuante.
    expect(paraCentavos(0.1)).toBe(10)
    expect(paraCentavos(30000)).toBe(3000000)
    expect(paraCentavos(1234.56)).toBe(123456)
  })

  it('nao recupera precisao que a entrada ja perdeu, e isso e limite do JSON', () => {
    // 1.005 chega como 1.00499999999999989, entao arredonda para 1.00. Nao ha
    // conserto possivel neste ponto: a perda aconteceu antes da funcao. A
    // protecao real e tudo depois daqui ser centavo inteiro.
    expect(paraCentavos(1.005)).toBe(100)
  })

  it('trata negativo com o sinal certo, e nao so no inteiro', () => {
    expect(paraCentavos(-1.5)).toBe(-150)
  })

  it('nunca produz centavo fracionario', () => {
    for (const valor of [0.01, 1.115, 999.999, 12345.678]) {
      expect(Number.isInteger(paraCentavos(valor))).toBe(true)
    }
  })
})

describe('simular_financiamento', () => {
  const entrada = simularFinanciamentoSchema.parse({
    valor: 30000,
    taxaMensal: 1.79,
    prazoMeses: 48,
  })

  it('devolve os mesmos numeros que o dominio, e nao os proprios', () => {
    const doDominio = price({
      principal: paraCentavos(30000),
      monthlyRate: rate(0.0179),
      termMonths: 48,
    })
    const daTool = simularFinanciamento(entrada)

    expect(daTool.totalPago).toBe(doDominio.totalPaid / 100)
    expect(daTool.totalJuros).toBe(doDominio.totalInterest / 100)
    expect(daTool.prazoMeses).toBe(doDominio.termMonths)
  })

  it('devolve valores em reais, porque quem chama conversa com uma pessoa', () => {
    const saida = simularFinanciamento(entrada)
    expect(saida.valorFinanciado).toBe(30000)
    expect(saida.totalPago).toBeGreaterThan(30000)
    expect(saida.totalPago).toBeLessThan(100000)
  })

  it('diz em que mes a metade foi amortizada', () => {
    expect(simularFinanciamento(entrada).mesDaMetadeAmortizada).toBeGreaterThan(24)
  })

  it('SAC paga menos juros que Price no mesmo cenario', () => {
    const comSac = simularFinanciamento({ ...entrada, sistema: 'sac' })
    expect(comSac.totalJuros).toBeLessThan(simularFinanciamento(entrada).totalJuros)
  })

  it('a parcela do SAC decresce, e a do Price nao', () => {
    const sacSaida = simularFinanciamento({ ...entrada, sistema: 'sac' })
    expect(sacSaida.ultimaParcela).toBeLessThan(sacSaida.primeiraParcela)

    const priceSaida = simularFinanciamento(entrada)
    expect(Math.abs(priceSaida.ultimaParcela - priceSaida.primeiraParcela)).toBeLessThan(1)
  })

  it('taxa zero nao cobra juros', () => {
    const semJuros = simularFinanciamento({ ...entrada, taxaMensal: 0 })
    expect(semJuros.totalJuros).toBe(0)
    expect(semJuros.totalPago).toBe(30000)
  })

  it('toda resposta carrega o aviso de material educativo', () => {
    expect(simularFinanciamento(entrada).aviso).toContain('Material educativo')
  })

  it('o schema recusa taxa em fracao decimal, que seria erro de fator cem ao contrario', () => {
    expect(
      simularFinanciamentoSchema.safeParse({ valor: 1, taxaMensal: 150, prazoMeses: 12 }).success,
    ).toBe(false)
  })

  it('o schema recusa prazo zero e valor negativo', () => {
    expect(
      simularFinanciamentoSchema.safeParse({ valor: 1, taxaMensal: 1, prazoMeses: 0 }).success,
    ).toBe(false)
    expect(
      simularFinanciamentoSchema.safeParse({ valor: -1, taxaMensal: 1, prazoMeses: 12 }).success,
    ).toBe(false)
  })
})

describe('comparar_cenarios', () => {
  const entrada = compararCenariosSchema.parse({
    valor: 30000,
    taxaMensal: 1.79,
    prazoMeses: 48,
    aporteMensal: 200,
  })

  it('antecipar economiza dinheiro e tempo', () => {
    const saida = compararCenarios(entrada)
    expect(saida.antecipar.economiaEmReais).toBeGreaterThan(0)
    expect(saida.antecipar.economiaEmMeses).toBeGreaterThan(0)
  })

  it('manter nao economiza contra si mesmo', () => {
    const saida = compararCenarios(entrada)
    expect(saida.manter.economiaEmReais).toBe(0)
    expect(saida.manter.economiaEmMeses).toBe(0)
  })

  it('a taxa de equilibrio fica entre zero e a taxa atual', () => {
    const equilibrio = compararCenarios(entrada).portabilidade.taxaDeEquilibrioMensalPercent
    expect(equilibrio).toBeGreaterThan(0)
    expect(equilibrio).toBeLessThan(1.79)
  })

  it('a explicacao diz o que fazer com o numero', () => {
    const texto = compararCenarios(entrada).portabilidade.explicacao
    expect(texto).toContain('abaixo de')
    expect(texto).toContain('ao mes')
  })

  it('sem taxa de destino, nao inventa um terceiro cenario', () => {
    expect(compararCenarios(entrada).portabilidade.naTaxaDeDestino).toBeNull()
  })

  it('com taxa de destino melhor que o limiar, portar ganha de antecipar', () => {
    const limiar = compararCenarios(entrada).portabilidade.taxaDeEquilibrioMensalPercent
    const saida = compararCenarios({ ...entrada, taxaDeDestino: limiar / 2 })
    expect(saida.portabilidade.naTaxaDeDestino?.economiaEmReais).toBeGreaterThan(
      saida.antecipar.economiaEmReais,
    )
  })

  it('aporte zero nao economiza nada', () => {
    const saida = compararCenarios({ ...entrada, aporteMensal: 0 })
    expect(saida.antecipar.economiaEmReais).toBe(0)
  })
})

describe('buscar_norma', () => {
  it('devolve os quatro parametros quando nao se pede campo', () => {
    expect(buscarNorma(buscarNormaSchema.parse({}))).toHaveLength(4)
  })

  it('todo parametro traz autoridade, fonte com URL e data de vigencia', () => {
    for (const norma of buscarNorma(buscarNormaSchema.parse({}))) {
      expect(norma.autoridade.length).toBeGreaterThan(0)
      expect(norma.fonte).toMatch(/^https?:\/\//)
      expect(norma.vigenteDesde).toMatch(/^\d{4}-\d{2}-\d{2}$/)
      expect(norma.descricao.length).toBeGreaterThan(0)
    }
  })

  it('separa norma de pratica de mercado, e o minimo de 15% e pratica', () => {
    const minimo = buscarNorma(buscarNormaSchema.parse({ campo: 'minimumFraction' }))[0]
    expect(minimo?.natureza).toBe('pratica de mercado')
    expect(minimo?.valor).toBe(0.15)
  })

  it('o teto e norma, e vale 100% do valor original', () => {
    const teto = buscarNorma(buscarNormaSchema.parse({ campo: 'totalChargeCap' }))[0]
    expect(teto?.natureza).toBe('norma')
    expect(teto?.valor).toBe(1)
  })

  it('o limite de ciclos do rotativo e um', () => {
    const ciclos = buscarNorma(buscarNormaSchema.parse({ campo: 'revolvingCycleLimit' }))[0]
    expect(ciclos?.valor).toBe(1)
    expect(ciclos?.autoridade).toContain('4.549')
  })

  it('le do preset do dominio, entao mudar a regra muda a tool sozinha', () => {
    const iof = buscarNorma(buscarNormaSchema.parse({ campo: 'iof' }))[0]
    expect(iof?.valor).toEqual({ fixed: 0.0038, daily: 0.000082, dailyCapDays: 365 })
  })

  it('o schema recusa campo desconhecido', () => {
    expect(buscarNormaSchema.safeParse({ campo: 'inventado' }).success).toBe(false)
  })
})
