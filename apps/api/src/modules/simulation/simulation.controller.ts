import { simulationInputSchema, type SimulationInput } from '@fluxo/contracts'
import { Body, Controller, Post, UsePipes } from '@nestjs/common'

import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe.js'
import { SimulationService, type SimulationOutput } from './simulation.service.js'

@Controller('simulation')
export class SimulationController {
  constructor(private readonly service: SimulationService) {}

  /**
   * Calcula um cenario.
   *
   * O corpo passa pelo schema de `packages/contracts` antes de encostar no
   * servico, entao o que chega aqui ja e `Cents` e `Rate` de verdade. O
   * controller nao calcula, so encaminha.
   */
  @Post()
  @UsePipes(new ZodValidationPipe(simulationInputSchema))
  simular(@Body() entrada: SimulationInput): SimulationOutput {
    return this.service.run(entrada)
  }
}
