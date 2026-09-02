import { cents, rate } from '@fluxo/domain'
import { describe, expect, it } from 'vitest'

import {
  formatCurrency,
  formatCurrencyRounded,
  formatMonthlyRate,
  formatPercent,
  formatTerm,
  parseCurrencyInput,
  parseIntegerInput,
  parseRateInput,
} from '../../lib/format'

/** O espaco do pt-BR em moeda e nao quebravel, entao normalizo antes de comparar. */
const normal = (texto: string): string => texto.replace(/\u00a0/g, ' ')

describe('formatCurrency', () => {
  it('formata centavos como moeda brasileira', () => {
    expect(normal(formatCurrency(cents(3000000)))).toBe('R$ 30.000,00')
  })

  it('mostra os centavos mesmo quando sao zero', () => {
    expect(normal(formatCurrency(cents(100)))).toBe('R$ 1,00')
  })

  it('formata zero', () => {
    expect(normal(formatCurrency(cents(0)))).toBe('R$ 0,00')
  })

  it('formata negativo, que e economia ao contrario', () => {
    expect(normal(formatCurrency(cents(-500)))).toBe('-R$ 5,00')
  })

  it('a versao arredondada some com os centavos', () => {
    expect(normal(formatCurrencyRounded(cents(3000050)))).toBe('R$ 30.001')
  })
})

describe('formatMonthlyRate e formatPercent', () => {
  it('escreve a taxa mensal com duas casas', () => {
    expect(formatMonthlyRate(rate(0.0179))).toBe('1,79% a.m.')
  })

  it('taxa zero aparece como zero', () => {
    expect(formatMonthlyRate(rate(0))).toBe('0,00% a.m.')
  })

  it('percentual converte fracao em porcentagem', () => {
    expect(formatPercent(0.4988)).toBe('49,88%')
  })
})

describe('formatTerm', () => {
  it('um mes fica no singular', () => {
    expect(formatTerm(1)).toBe('1 mes')
  })

  it('menos de um ano fica em meses', () => {
    expect(formatTerm(7)).toBe('7 meses')
  })

  it('doze meses viram um ano', () => {
    expect(formatTerm(12)).toBe('1 ano')
  })

  it('multiplo de doze fica so em anos', () => {
    expect(formatTerm(48)).toBe('4 anos')
  })

  it('com resto, junta anos e meses', () => {
    expect(formatTerm(37)).toBe('3 anos e 1 mes')
    expect(formatTerm(30)).toBe('2 anos e 6 meses')
  })

  it('zero mes', () => {
    expect(formatTerm(0)).toBe('0 meses')
  })
})

describe('parseCurrencyInput', () => {
  it('le o formato brasileiro completo', () => {
    expect(parseCurrencyInput('1.234,56')).toBe(123456)
  })

  it('le sem separador de milhar', () => {
    expect(parseCurrencyInput('1234,56')).toBe(123456)
  })

  it('le com ponto decimal', () => {
    expect(parseCurrencyInput('1234.56')).toBe(123456)
  })

  it('le inteiro puro', () => {
    expect(parseCurrencyInput('30000')).toBe(3000000)
  })

  it('ignora simbolo de moeda e espaco', () => {
    expect(parseCurrencyInput('R$ 1.000,00')).toBe(100000)
  })

  it('arredonda o terceiro decimal meio para cima', () => {
    // 1.005 * 100 da 100.49999999999999 em ponto flutuante. Este teste existe
    // porque a primeira versao caiu nisso e devolvia 100.
    expect(parseCurrencyInput('1,005')).toBe(101)
    expect(parseCurrencyInput('1,004')).toBe(100)
  })

  it('o arredondamento propaga o vai um', () => {
    expect(parseCurrencyInput('1,999')).toBe(200)
  })

  it('completa o decimal faltante', () => {
    expect(parseCurrencyInput('12,5')).toBe(1250)
  })

  it('devolve nulo para vazio', () => {
    expect(parseCurrencyInput('')).toBeNull()
    expect(parseCurrencyInput('   ')).toBeNull()
  })

  it('devolve nulo para texto sem numero', () => {
    expect(parseCurrencyInput('abc')).toBeNull()
  })

  it('le negativo com decimais', () => {
    expect(parseCurrencyInput('-1.234,56')).toBe(-123456)
  })

  it('recusa valor cujos reais ja passam do inteiro seguro', () => {
    expect(parseCurrencyInput('999999999999999999999')).toBeNull()
  })

  it('recusa valor cujos centavos estouram o inteiro seguro', () => {
    // Os reais cabem, o total em centavos nao. O guarda precisa pegar os dois.
    expect(parseCurrencyInput('90071992547410')).toBeNull()
  })

  it('nunca devolve NaN', () => {
    for (const entrada of ['-', ',', '.', '-,', '1.2.3,4,5']) {
      const lido = parseCurrencyInput(entrada)
      expect(lido === null || Number.isFinite(lido)).toBe(true)
    }
  })
})

describe('parseRateInput', () => {
  it('le percentual como fracao decimal', () => {
    expect(parseRateInput('1,79')).toBeCloseTo(0.0179, 10)
  })

  it('le percentual inteiro', () => {
    expect(parseRateInput('15')).toBeCloseTo(0.15, 10)
  })

  it('devolve nulo para vazio', () => {
    expect(parseRateInput('')).toBeNull()
  })
})

describe('parseIntegerInput', () => {
  it('le prazo em meses', () => {
    expect(parseIntegerInput('48')).toBe(48)
  })

  it('descarta o que nao e digito', () => {
    expect(parseIntegerInput('48 meses')).toBe(48)
  })

  it('devolve nulo para vazio', () => {
    expect(parseIntegerInput('')).toBeNull()
    expect(parseIntegerInput('meses')).toBeNull()
  })
})
