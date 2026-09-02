import { BadRequestException, Injectable, type PipeTransform } from '@nestjs/common'
import type { ZodType } from 'zod'

/**
 * Valida o corpo da requisicao contra um schema de `packages/contracts`.
 *
 * O que sai daqui ja esta marcado: `centsSchema` devolve `Cents` de verdade,
 * entao o controller passa o valor direto para o dominio sem nenhum cast. E o
 * ADR 0011 funcionando na pratica.
 */
@Injectable()
export class ZodValidationPipe<Entrada, Saida> implements PipeTransform<unknown, Saida> {
  constructor(private readonly schema: ZodType<Saida, Entrada>) {}

  transform(valor: unknown): Saida {
    const resultado = this.schema.safeParse(valor)
    if (!resultado.success) {
      throw new BadRequestException({
        message: 'Requisicao invalida',
        issues: resultado.error.issues.map((problema) => ({
          path: problema.path.join('.'),
          message: problema.message,
        })),
      })
    }
    return resultado.data
  }
}
