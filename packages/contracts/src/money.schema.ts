import { cents, rate, type Cents, type Rate } from '@fluxo/domain'
import { z } from 'zod'

/**
 * Teto de sanidade para taxa mensal: 100% ao mes.
 *
 * Nao existe para proteger o calculo, que aguenta qualquer numero finito.
 * Existe porque taxa acima disso e sempre erro de fator cem, e recusar na borda
 * e melhor que simular um absurdo.
 *
 * O teto comecou em 1000% e um teste de contrato mostrou que naquele valor ele
 * nao protegia nada: `1.79`, que e alguem digitando 1,79% sem dividir, passava
 * como 179% ao mes. O rotativo brasileiro, que e a taxa mais alta que este
 * produto simula, gira perto de 14% ao mes. Cem por cento ja e sete vezes isso.
 */
const TAXA_MENSAL_MAXIMA = 1

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
  .max(TAXA_MENSAL_MAXIMA, 'Taxa mensal acima de 100%: mande fracao decimal, nao percentual')
  .transform((valor) => rate(valor))

/** Prazo em meses, sempre inteiro positivo, com teto de cinquenta anos. */
export const termMonthsSchema = z
  .number()
  .int('Prazo precisa ser inteiro')
  .min(1, 'Prazo precisa ser de pelo menos um mes')
  .max(600, 'Prazo acima de cinquenta anos')
