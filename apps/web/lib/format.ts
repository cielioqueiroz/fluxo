import type { Cents, Rate } from '@fluxo/domain'

/**
 * Formatacao para a tela. Nao calcula nada.
 *
 * O dominio nao conhece locale e nao vai conhecer. Toda conversao de centavo
 * para texto legivel acontece aqui, uma vez, e os formatadores sao criados no
 * modulo para nao reconstruir um Intl.NumberFormat por celula de tabela.
 */

const moeda = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

const moedaSemCentavos = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
})

const percentual = new Intl.NumberFormat('pt-BR', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

const inteiro = new Intl.NumberFormat('pt-BR')

export const formatCurrency = (valor: Cents): string => moeda.format(valor / 100)

/** Para numeros grandes em que o centavo e ruido, como o total pago. */
export const formatCurrencyRounded = (valor: Cents): string =>
  moedaSemCentavos.format(Math.round(valor / 100))

export const formatMonthlyRate = (taxa: Rate): string => `${percentual.format(taxa * 100)}% a.m.`

export const formatPercent = (fracao: number): string => `${percentual.format(fracao * 100)}%`

/**
 * Prazo em linguagem de gente.
 *
 * 24 vira "2 anos", 30 vira "2 anos e 6 meses", 7 vira "7 meses".
 */
export function formatTerm(meses: number): string {
  if (meses < 12) {
    return meses === 1 ? '1 mes' : `${inteiro.format(meses)} meses`
  }
  const anos = Math.floor(meses / 12)
  const resto = meses % 12
  const parteAnos = anos === 1 ? '1 ano' : `${inteiro.format(anos)} anos`
  if (resto === 0) {
    return parteAnos
  }
  const parteMeses = resto === 1 ? '1 mes' : `${inteiro.format(resto)} meses`
  return `${parteAnos} e ${parteMeses}`
}

/**
 * Le um valor digitado em reais e devolve centavos inteiros.
 *
 * Aceita "1.234,56", "1234,56" e "1234.56". Devolve nulo quando nao da para
 * ler, e quem chama decide o que fazer. Nunca devolve NaN.
 *
 * **Trabalha sobre os digitos, nunca multiplicando por cem.** A primeira versao
 * fazia `Math.round(Number(texto) * 100)`, e um teste pegou o defeito: "1,005"
 * virava 100 em vez de 101, porque `1.005 * 100` da `100.49999999999999` em
 * ponto flutuante. Esta e exatamente a fronteira onde reais viram centavos,
 * entao e o ultimo lugar do produto onde float pode aparecer.
 */
export function parseCurrencyInput(texto: string): number | null {
  const limpo = texto.replace(/[^\d,.-]/g, '').trim()
  if (limpo === '') {
    return null
  }

  const negativo = limpo.startsWith('-')
  const semSinal = limpo.replace(/-/g, '')
  const separador = Math.max(semSinal.lastIndexOf(','), semSinal.lastIndexOf('.'))

  const digitosInteiros =
    separador === -1 ? semSinal.replace(/\D/g, '') : semSinal.slice(0, separador).replace(/\D/g, '')
  const digitosDecimais = separador === -1 ? '' : semSinal.slice(separador + 1).replace(/\D/g, '')

  if (digitosInteiros === '' && digitosDecimais === '') {
    return null
  }

  const reais = digitosInteiros === '' ? 0 : Number(digitosInteiros)
  if (!Number.isSafeInteger(reais)) {
    return null
  }

  // Meio para cima no terceiro decimal, comparando o caractere. '5' e 53.
  let centavos = Number(digitosDecimais.slice(0, 2).padEnd(2, '0'))
  const terceiro = digitosDecimais.charCodeAt(2)
  if (!Number.isNaN(terceiro) && terceiro >= 53) {
    centavos += 1
  }

  const total = reais * 100 + centavos
  if (!Number.isSafeInteger(total)) {
    return null
  }
  return negativo ? -total : total
}

/** Le um percentual digitado e devolve fracao decimal. "1,5" vira 0.015. */
export function parseRateInput(texto: string): number | null {
  const centavos = parseCurrencyInput(texto)
  return centavos === null ? null : centavos / 10000
}

/** Le um inteiro digitado. Devolve nulo quando nao da para ler. */
export function parseIntegerInput(texto: string): number | null {
  const limpo = texto.replace(/\D/g, '')
  if (limpo === '') {
    return null
  }
  const numero = Number(limpo)
  return Number.isSafeInteger(numero) ? numero : null
}
