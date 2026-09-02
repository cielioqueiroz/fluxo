import { type Cents } from '../money/decimal.js'
import { type Rate } from '../money/rate.js'

export interface IofParams {
  readonly fixed: Rate
  readonly daily: Rate
  /** A parcela diaria para de correr depois deste numero de dias. */
  readonly dailyCapDays: number
}

export interface CardParams {
  /** Quantos ciclos o saldo pode ficar no rotativo antes de virar parcelamento. */
  readonly revolvingCycleLimit: number
  /** Fracao da fatura cobrada no pagamento minimo. */
  readonly minimumFraction: Rate
  readonly iof: IofParams | null
  /** Teto de encargos sobre o valor original, somando os dois estagios. */
  readonly totalChargeCap: Rate | null
}

export type PaymentPolicy =
  | { readonly kind: 'minimum' }
  | { readonly kind: 'fixed'; readonly amount: Cents }
  | { readonly kind: 'full' }

export interface CardInput {
  readonly invoice: Cents
  readonly revolvingRate: Rate
  readonly installmentRate: Rate
  /**
   * Prazo do parcelamento obrigatorio depois do rotativo.
   *
   * Zero quer dizer que nao ha parcelamento e o rotativo segue sozinho ate o
   * limite de ciclos. So um motor sem a regra brasileira usa zero.
   */
  readonly installmentTermMonths: number
  readonly policy: PaymentPolicy
  readonly params: CardParams
}

/**
 * De onde veio cada parametro de um preset.
 *
 * `kind` separa o que e norma do que e pratica de mercado. Um preset que
 * apresenta pratica como regulacao e pior do que nao ter preset.
 */
export interface ParamProvenance {
  readonly field: keyof CardParams
  readonly authority: string
  readonly source: string
  readonly effectiveFrom: string
  readonly kind: 'regulation' | 'market-practice'
}
