import type { SimulationInput } from '@fluxo/contracts'
import {
  BRASIL,
  cardDebt,
  compare,
  price,
  sac,
  summarizeForInsight,
  type CardParams,
  type Comparison,
  type InsightInput,
  type Schedule,
} from '@fluxo/domain'
import { Injectable } from '@nestjs/common'

/** Os presets que o servidor conhece. O cliente escolhe pelo nome, nunca pelo valor. */
const PRESETS: Record<'brasil', CardParams> = {
  brasil: BRASIL,
}

/**
 * O que o servico devolve, tipado pelo dominio e nao pelo schema.
 *
 * O schema de `packages/contracts` descreve a forma que atravessa a rede, com
 * arrays mutaveis, porque e isso que o JSON entrega do outro lado. O dominio
 * devolve estruturas somente leitura. Forcar os dois a serem o mesmo tipo
 * obrigaria a copiar a tabela inteira para tirar o `readonly`, o que seria
 * copiar 360 linhas por requisicao para agradar o compilador.
 *
 * A relacao entre os dois e verificada onde importa: o teste de contrato passa
 * a resposta HTTP de verdade pelo `simulationResultSchema`.
 */
export interface SimulationOutput {
  readonly result: {
    readonly schedule: Schedule
    readonly comparison: Comparison | null
    readonly card: {
      readonly capReachedAtPeriod: number | null
      readonly revolvingEndedAtPeriod: number | null
    } | null
  }
  readonly summary: InsightInput
}

/**
 * A ponte entre o HTTP e o dominio.
 *
 * Nao calcula nada. Traduz a entrada validada em uma chamada de
 * `packages/domain` e devolve o que veio de la. Se algum dia aparecer uma conta
 * dentro deste arquivo, ela esta no lugar errado.
 */
@Injectable()
export class SimulationService {
  run(entrada: SimulationInput): SimulationOutput {
    if (entrada.kind === 'loan') {
      const emprestimo = {
        principal: entrada.principal,
        monthlyRate: entrada.monthlyRate,
        termMonths: entrada.termMonths,
      }
      const schedule = entrada.system === 'sac' ? sac(emprestimo) : price(emprestimo)

      return {
        result: {
          schedule,
          // A comparacao usa sempre Price: SAC nao tem aporte recorrente com
          // parcela fixa, entao comparar os dois seria comparar coisas
          // diferentes.
          comparison: compare(emprestimo, entrada.monthlyExtra, null),
          card: null,
        },
        summary: summarizeForInsight(schedule, 'loan', null),
      }
    }

    const resultado = cardDebt({
      invoice: entrada.invoice,
      revolvingRate: entrada.revolvingRate,
      installmentRate: entrada.installmentRate,
      installmentTermMonths: entrada.installmentTermMonths,
      policy: entrada.policy,
      params: PRESETS[entrada.preset],
    })

    return {
      result: {
        schedule: resultado.schedule,
        comparison: null,
        card: {
          capReachedAtPeriod: resultado.capReachedAtPeriod,
          revolvingEndedAtPeriod: resultado.revolvingEndedAtPeriod,
        },
      },
      summary: summarizeForInsight(resultado.schedule, 'card', resultado.capReachedAtPeriod),
    }
  }
}
