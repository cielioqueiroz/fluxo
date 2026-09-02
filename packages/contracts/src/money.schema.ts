import { cents, rate, type Cents, type Rate } from '@fluxo/domain'
import { z } from 'zod'

/**
 * Teto de sanidade para taxa mensal: 1000% ao mes.
 *
 * Nao existe para proteger o calculo, que aguenta qualquer numero finito.
 * Existe porque taxa acima disso quase sempre e percentual mandado sem
 * dividir por cem, e recusar na borda e melhor que simular um absurdo.
 */
const TAXA_MENSAL_MAXIMA = 10

/**
 * Dinheiro na borda HTTP.
 *
 * Valida primeiro e marca depois, com o proprio construtor do dominio. O valor
 * que sai do `parse` e `Cents` de verdade e entra no dominio sem cast. Usar
 * `.brand()` do Zod produziria um tipo estruturalmente diferente, e cada
 * travessia de fronteira precisaria de conversao. Ver ADR 0011.
 */
export const centsSchema: z.ZodType<Cents, number> = z
  .number()
  .int('Dinheiro precisa ser inteiro em centavos')
  .nonnegative('Dinheiro nao pode ser negativo')
  .refine(Number.isSafeInteger, 'Dinheiro alem do inteiro seguro')
  .transform((valor) => cents(valor))

/**
 * Dinheiro que pode ser negativo.
 *
 * Amortizacao negativa e a divida crescendo no rotativo, e economia negativa e
 * uma estrategia que sai mais cara. Os dois sao resultados validos, entao o
 * schema de saida precisa aceita-los.
 */
export const signedCentsSchema: z.ZodType<Cents, number> = z
  .number()
  .int('Dinheiro precisa ser inteiro em centavos')
  .refine(Number.isSafeInteger, 'Dinheiro alem do inteiro seguro')
  .transform((valor) => cents(valor))

export const rateSchema: z.ZodType<Rate, number> = z
  .number()
  .finite('Taxa precisa ser finita')
  .nonnegative('Taxa nao pode ser negativa')
  .max(TAXA_MENSAL_MAXIMA, 'Taxa mensal acima de 1000%: mande fracao decimal, nao percentual')
  .transform((valor) => rate(valor))

/** Prazo em meses, sempre inteiro positivo, com teto de cinquenta anos. */
export const termMonthsSchema = z
  .number()
  .int('Prazo precisa ser inteiro')
  .min(1, 'Prazo precisa ser de pelo menos um mes')
  .max(600, 'Prazo acima de cinquenta anos')
