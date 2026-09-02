import { assertTerm, pricePayment, type LoanInput } from '../amortization/price.js'
import {
  buildSchedule,
  closeRow,
  type Installment,
  type Schedule,
} from '../amortization/schedule.js'
import { ZERO, add, smallest, sub, type Cents } from '../money/decimal.js'
import { applyRate } from '../money/rate.js'

/**
 * Paga a parcela normal mais `extra` todo mes, com o excedente abatendo
 * principal. O prazo encurta e a parcela nao muda.
 */
export function prepayWithMonthlyExtra(loan: LoanInput, extra: Cents): Schedule {
  const { principal, monthlyRate, termMonths } = loan
  assertTerm(termMonths)

  const fixed = pricePayment(principal, monthlyRate, termMonths)
  const rows: Installment[] = []
  let balance = principal
  let period = 0

  while (balance > ZERO && period < termMonths) {
    period += 1
    const openingBalance = balance
    const interest = applyRate(openingBalance, monthlyRate)
    const isLast = period === termMonths

    const desejada = add(sub(fixed, interest), extra)
    const amortization = isLast ? openingBalance : smallest(desejada, openingBalance)
    const payment = add(amortization, interest)
    const closingBalance = closeRow(openingBalance, interest, ZERO, payment)

    rows.push({
      period,
      stage: 'loan',
      openingBalance,
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
