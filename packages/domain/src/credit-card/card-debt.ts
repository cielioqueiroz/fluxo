import { pricePayment } from '../amortization/price.js'
import {
  buildSchedule,
  closeRow,
  type Installment,
  type Schedule,
} from '../amortization/schedule.js'
import { ZERO, add, cents, smallest, sub } from '../money/decimal.js'
import { applyRate } from '../money/rate.js'
import { type CardInput } from './params.js'
import { revolvingStage } from './revolving.js'

export interface CardOutcome {
  readonly schedule: Schedule
  readonly capReachedAtPeriod: number | null
  /** Em que periodo o rotativo terminou. Nulo quando ele nunca terminou. */
  readonly revolvingEndedAtPeriod: number | null
}

/**
 * A divida de cartao em dois estagios.
 *
 * No Brasil, desde a Resolucao CMN 4.549 de 2017, o saldo so fica no rotativo
 * ate o vencimento da fatura seguinte, e depois vira parcelamento obrigatorio.
 * O teto da Lei 14.690 conta os dois estagios somados.
 */
export function cardDebt(input: CardInput): CardOutcome {
  const { invoice, revolvingRate, installmentRate, installmentTermMonths, policy, params } = input

  const allowance =
    params.totalChargeCap === null ? null : applyRate(invoice, params.totalChargeCap)

  const stage1 = revolvingStage({
    invoice,
    monthlyRate: revolvingRate,
    policy,
    params,
    startPeriod: 1,
    chargeAllowance: allowance,
  })

  const rows: Installment[] = [...stage1.rows]
  let capReachedAtPeriod = stage1.capReachedAtPeriod
  const ultimoPeriodoDoRotativo = stage1.rows[stage1.rows.length - 1]?.period ?? null

  const rotativoQuitou = stage1.balance <= ZERO
  const temParcelamento = installmentTermMonths > 0

  // "Nunca quita" so e verdade quando nao ha parcelamento depois. Com o limite
  // brasileiro de um ciclo, saldo crescendo no rotativo nao e divida eterna: e
  // um saldo maior entrando no parcelamento obrigatorio.
  const neverSettles = !rotativoQuitou && !temParcelamento && stage1.grewEveryCycle

  if (rotativoQuitou || !temParcelamento) {
    return {
      schedule: buildSchedule(rows, invoice, { requireSettled: false, neverSettles }),
      capReachedAtPeriod,
      revolvingEndedAtPeriod: rotativoQuitou ? ultimoPeriodoDoRotativo : null,
    }
  }

  // Estagio 2: o saldo vira uma tabela Price, e o teto continua contando.
  let balance = stage1.balance
  let chargesUsed = stage1.chargesUsed
  const fixed = pricePayment(balance, installmentRate, installmentTermMonths)
  const startPeriod = (ultimoPeriodoDoRotativo ?? 0) + 1

  for (let k = 0; k < installmentTermMonths; k += 1) {
    if (balance <= ZERO) {
      break
    }
    const period = startPeriod + k
    const openingBalance = balance

    const desejado = applyRate(openingBalance, installmentRate)
    const disponivel = allowance === null ? desejado : sub(allowance, chargesUsed)
    const interest = smallest(desejado, cents(Math.max(0, disponivel)))
    if (interest < desejado && capReachedAtPeriod === null) {
      capReachedAtPeriod = period
    }
    chargesUsed = add(chargesUsed, interest)

    const isLast = k === installmentTermMonths - 1
    const candidata = sub(fixed, interest)
    const amortization = isLast || candidata >= openingBalance ? openingBalance : candidata
    const payment = add(amortization, interest)
    const closingBalance = closeRow(openingBalance, interest, ZERO, payment)

    rows.push({
      period,
      stage: 'installment',
      openingBalance,
      interest,
      fees: ZERO,
      amortization,
      payment,
      closingBalance,
    })
    balance = closingBalance
  }

  return {
    schedule: buildSchedule(rows, invoice, { requireSettled: true, neverSettles: false }),
    capReachedAtPeriod,
    revolvingEndedAtPeriod: ultimoPeriodoDoRotativo,
  }
}
