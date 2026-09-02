import { ZERO, add, sub, type Cents } from '../money/decimal.js'

export type Stage = 'loan' | 'revolving' | 'installment'

export interface Installment {
  readonly period: number
  readonly stage: Stage
  readonly openingBalance: Cents
  readonly interest: Cents
  readonly fees: Cents
  /** Negativo quando o pagamento nao cobre os encargos e a divida cresce. */
  readonly amortization: Cents
  readonly payment: Cents
  readonly closingBalance: Cents
}

export interface Schedule {
  readonly installments: readonly Installment[]
  readonly principal: Cents
  readonly totalPaid: Cents
  readonly totalInterest: Cents
  readonly totalFees: Cents
  readonly finalBalance: Cents
  /** Quitou dentro do horizonte simulado. */
  readonly settled: boolean
  /** O pagamento e estruturalmente menor que os encargos, entao nao quita nunca. */
  readonly neverSettles: boolean
  readonly termMonths: number
}

export interface BuildOptions {
  readonly requireSettled: boolean
  readonly neverSettles: boolean
}

/**
 * O unico lugar do pacote que decide se uma tabela e valida.
 *
 * Todo calculo passa por aqui, entao a regra do centavo e as invariantes moram
 * em um lugar so em vez de espalhadas por quatro arquivos.
 */
export function buildSchedule(
  rows: readonly Installment[],
  principal: Cents,
  options: BuildOptions,
): Schedule {
  const last = rows[rows.length - 1]
  if (last === undefined) {
    throw new RangeError('Tabela vazia nao e tabela de amortizacao')
  }

  let totalPaid = ZERO
  let totalInterest = ZERO
  let totalFees = ZERO
  let totalAmortized = ZERO

  for (const row of rows) {
    const saldoEsperado = sub(add(add(row.openingBalance, row.interest), row.fees), row.payment)
    if (saldoEsperado !== row.closingBalance) {
      throw new RangeError(
        `Saldo final da linha ${row.period} nao fecha: esperado ${saldoEsperado}, recebido ${row.closingBalance}`,
      )
    }
    const amortizacaoEsperada = sub(sub(row.payment, row.interest), row.fees)
    if (amortizacaoEsperada !== row.amortization) {
      throw new RangeError(
        `Amortizacao da linha ${row.period} nao fecha: esperado ${amortizacaoEsperada}, recebido ${row.amortization}`,
      )
    }
    totalPaid = add(totalPaid, row.payment)
    totalInterest = add(totalInterest, row.interest)
    totalFees = add(totalFees, row.fees)
    totalAmortized = add(totalAmortized, row.amortization)
  }

  const finalBalance = last.closingBalance
  const devolvido = add(totalAmortized, finalBalance)
  if (devolvido !== principal) {
    throw new RangeError(
      `Amortizacoes mais saldo final devem devolver o principal ${principal}, deram ${devolvido}`,
    )
  }

  const settled = finalBalance === ZERO
  if (settled && options.neverSettles) {
    throw new RangeError('Uma tabela nao pode quitar e nunca quitar ao mesmo tempo')
  }
  if (options.requireSettled && !settled) {
    throw new RangeError(`Esta tabela precisa quitar, mas sobrou saldo de ${finalBalance}`)
  }

  return {
    installments: rows,
    principal,
    totalPaid,
    totalInterest,
    totalFees,
    finalBalance,
    settled,
    neverSettles: options.neverSettles,
    termMonths: rows.length,
  }
}

/** Usado por quem constroi linhas, para nao repetir a conta em cada calculo. */
export function closeRow(
  openingBalance: Cents,
  interest: Cents,
  fees: Cents,
  payment: Cents,
): Cents {
  return sub(add(add(openingBalance, interest), fees), payment)
}
