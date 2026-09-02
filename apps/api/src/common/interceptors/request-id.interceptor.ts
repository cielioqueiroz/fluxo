import { randomUUID } from 'node:crypto'

import {
  Injectable,
  Logger,
  type CallHandler,
  type ExecutionContext,
  type NestInterceptor,
} from '@nestjs/common'
import type { FastifyReply, FastifyRequest } from 'fastify'
import { tap, type Observable } from 'rxjs'

/**
 * Da um identificador a cada requisicao e registra quanto ela custou.
 *
 * O identificador volta no cabecalho `x-request-id` e aparece no corpo de erro,
 * entao quem viu a falha na tela consegue apontar a linha exata do log.
 * Se o cliente ja mandou um, ele e respeitado: assim o rastro atravessa o
 * front e a API sem quebrar.
 */
@Injectable()
export class RequestIdInterceptor implements NestInterceptor {
  private readonly logger = new Logger('http')

  intercept(contexto: ExecutionContext, proximo: CallHandler): Observable<unknown> {
    const http = contexto.switchToHttp()
    const requisicao = http.getRequest<FastifyRequest & { requestId?: string }>()
    const resposta = http.getResponse<FastifyReply>()

    const recebido = requisicao.headers['x-request-id']
    const requestId = typeof recebido === 'string' && recebido !== '' ? recebido : randomUUID()

    requisicao.requestId = requestId
    void resposta.header('x-request-id', requestId)

    const inicio = process.hrtime.bigint()
    return proximo.handle().pipe(
      tap(() => {
        const ms = Number(process.hrtime.bigint() - inicio) / 1_000_000
        this.logger.log(`[${requestId}] ${requisicao.method} ${requisicao.url} ${ms.toFixed(1)}ms`)
      }),
    )
  }
}
