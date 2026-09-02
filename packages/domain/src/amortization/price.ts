import { ZERO, add, cents, roundHalfUp, sub, type Cents } from '../money/decimal.js'
import { applyRate, type Rate } from '../money/rate.js'
import { buildSchedule, closeRow, type Installment, type Schedule } from './schedule.js'

export interface LoanInput {
  readonly principal: Cents
  readonly monthlyRate: Rate
  readonly termMonths: number
}

export function assertTerm(termMonths: number): void {
  if (!Number.isSafeInteger(termMonths) || termMonths < 1) {
    throw new RangeError(`Prazo precisa ser inteiro positivo, recebido ${termMonths}`)
  }
}

/**
 * Parcela fixa da tabela Price.
 *
 * Com taxa zero a formula dividiria por zero, entao o caso e tratado como caso:
 * a parcela vira o principal dividido pelo prazo, truncado, e a ultima parcela
 * do cronograma absorve o residuo.
 */
export function pricePayment(principal: Cents, monthlyRate: Rate, termMonths: number): Cents {
  assertTerm(termMonths)
  if (monthlyRate === 0) {
    return cents(Math.trunc(principal / termMonths))
  }
  return cents(roundHalfUp((principal * monthlyRate) / (1 - (1 + monthlyRate) ** -termMonths)))
}

export function price(input: LoanInput): Schedule {
  const { principal, monthlyRate, termMonths } = input
  assertTerm(termMonths)

  const fixed = pricePayment(principal, monthlyRate, termMonths)
  const rows: Installment[] = []
  let balance = principal

  for (let period = 1; period <= termMonths; period += 1) {
    const interest = applyRate(balance, monthlyRate)
    const isLast = period === termMonths
    // Na ultima linha a conta e invertida: a amortizacao e o saldo em aberto, e
    // o pagamento decorre dela. E isso que garante o zero exato sem depender de
    // sorte de arredondamento.
    const amortization = isLast ? balance : sub(fixed, interest)
    const payment = add(amortization, interest)
    const closingBalance = closeRow(balance, interest, ZERO, payment)

    rows.push({
      period,
      stage: 'loan',
      openingBalance: balance,
      interest,
      fees: ZERO,
      amortization,
      payment,
      closingBalance,
    })
    balance = closingBalance
  }

  return buildSchedule(rows, principal, { requireSettled: true, neverSettles: false })
}
