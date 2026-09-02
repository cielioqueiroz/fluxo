import { ZERO, add, distributeOverInstallments } from '../money/decimal.js'
import { applyRate } from '../money/rate.js'
import { assertTerm, type LoanInput } from './price.js'
import { buildSchedule, closeRow, type Installment, type Schedule } from './schedule.js'

export function sac(input: LoanInput): Schedule {
  const { principal, monthlyRate, termMonths } = input
  assertTerm(termMonths)

  // O residuo ja sai na ultima amortizacao, entao o saldo fecha em zero sozinho.
  const plan = distributeOverInstallments(principal, termMonths)
  const rows: Installment[] = []
  let balance = principal

  for (const [index, amortization] of plan.entries()) {
    const interest = applyRate(balance, monthlyRate)
    const payment = add(amortization, interest)
    const closingBalance = closeRow(balance, interest, ZERO, payment)

    rows.push({
      period: index + 1,
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
