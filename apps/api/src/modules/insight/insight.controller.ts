import { insightInputSchema, type InsightInput, type InsightResponse } from '@fluxo/contracts'
import { Body, Controller, Post, UsePipes } from '@nestjs/common'

import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe.js'
import { InsightService } from './insight.service.js'

@Controller('insight')
export class InsightController {
  constructor(private readonly service: InsightService) {}

  /**
   * Escreve a leitura de um cenario ja calculado.
   *
   * O corpo e o resumo que o dominio produziu, e o schema recusa qualquer coisa
   * alem dele. E assim que o orcamento de contexto da secao 6 do AGENTS.md deixa
   * de ser promessa: se alguem tentar anexar o array de parcelas, a requisicao
   * nem chega ao servico.
   *
   * A rota sempre devolve 201. Falha do modelo nao e falha da requisicao: ela
   * volta com `degraded: true`, e o front mostra o resumo deterministico.
   */
  @Post()
  @UsePipes(new ZodValidationPipe(insightInputSchema))
  async ler(@Body() resumo: InsightInput): Promise<InsightResponse> {
    return this.service.read(resumo)
  }
}
