import { closeRow, type Installment } from '../amortization/schedule.js'
import { ZERO, add, cents, smallest, sub, type Cents } from '../money/decimal.js'
import { applyRate, rate, type Rate } from '../money/rate.js'
import { resolvePayment } from './minimum-payment.js'
import { type CardParams, type IofParams, type PaymentPolicy } from './params.js'

/** Trinta dias por ciclo. O dominio nao tem calendario e nao vai ter. */
const DAYS_PER_CYCLE = 30

export interface StageResult {
  readonly rows: readonly Installment[]
  readonly balance: Cents
  readonly chargesUsed: Cents
  readonly capReachedAtPeriod: number | null
  /** Nenhuma linha amortizou nada. Observacao, nao veredito. */
  readonly grewEveryCycle: boolean
  readonly iofDaysUsed: number
}

export interface RevolvingInput {
  readonly invoice: Cents
  readonly monthlyRate: Rate
  readonly policy: PaymentPolicy
  readonly params: CardParams
  readonly startPeriod: number
  /** Quanto ainda cabe de encargo antes do teto. Nulo quer dizer sem teto. */
  readonly chargeAllowance: Cents | null
}

function iofFor(balance: Cents, iof: IofParams | null, daysUsed: number): readonly [Cents, number] {
  if (iof === null) {
    return [ZERO, daysUsed]
  }
  const daysLeft = Math.max(0, iof.dailyCapDays - daysUsed)
  const days = Math.min(DAYS_PER_CYCLE, daysLeft)
  const effective = rate(iof.fixed + iof.daily * days)
  return [applyRate(balance, effective), daysUsed + days]
}

/**
 * O estagio de rotativo, ciclo a ciclo.
 *
 * Relata fato e nao decide: devolve `grewEveryCycle`, que e uma observacao
 * sobre as linhas produzidas. Quem transforma isso em "a divida nunca quita" e
 * o orquestrador, porque so ele sabe se existe parcelamento depois.
 */
export function revolvingStage(input: RevolvingInput): StageResult {
  const { invoice, monthlyRate, policy, params, startPeriod, chargeAllowance } = input

  const rows: Installment[] = []
  let balance = invoice
  let chargesUsed = ZERO
  let capReachedAtPeriod: number | null = null
  let iofDaysUsed = 0
  let grewEveryCycle = true

  for (let cycle = 0; cycle < params.revolvingCycleLimit; cycle += 1) {
    if (balance <= ZERO) {
      break
    }
    const period = startPeriod + cycle
    const openingBalance = balance

    const interestRaw = applyRate(openingBalance, monthlyRate)
    const [feesRaw, novosDias] = iofFor(openingBalance, params.iof, iofDaysUsed)
    iofDaysUsed = novosDias

    const desejado = add(interestRaw, feesRaw)
    const disponivel = chargeAllowance === null ? desejado : sub(chargeAllowance, chargesUsed)
    const cobrado = smallest(desejado, cents(Math.max(0, disponivel)))
    if (cobrado < desejado && capReachedAtPeriod === null) {
      capReachedAtPeriod = period
    }

    // O corte do teto atinge primeiro os juros, depois o IOF, para que a linha
    // continue somando exatamente o que foi cobrado.
    const interest = smallest(interestRaw, cobrado)
    const fees = sub(cobrado, interest)
    chargesUsed = add(chargesUsed, cobrado)

    const invoiceOfCycle = add(openingBalance, cobrado)
    const payment = resolvePayment(invoiceOfCycle, policy, params.minimumFraction)
    const closingBalance = closeRow(openingBalance, interest, fees, payment)
    const amortization = sub(sub(payment, interest), fees)

    if (amortization >= ZERO) {
      grewEveryCycle = false
    }

    rows.push({
      period,
      stage: 'revolving',
      openingBalance,
      interest,
      fees,
      amortization,
      payment,
      closingBalance,
    })
    balance = closingBalance
  }

  return {
    rows,
    balance,
    chargesUsed,
    capReachedAtPeriod,
    grewEveryCycle: rows.length > 0 && grewEveryCycle,
    iofDaysUsed,
  }
}
