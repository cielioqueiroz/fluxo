import {
  Catch,
  HttpException,
  HttpStatus,
  Logger,
  type ArgumentsHost,
  type ExceptionFilter,
} from '@nestjs/common'
import type { FastifyReply, FastifyRequest } from 'fastify'

interface CorpoDeErro {
  readonly statusCode: number
  readonly requestId: string
  readonly message?: string
  readonly issues?: readonly { readonly path: string; readonly message: string }[]
}

/**
 * Filtro global de excecao.
 *
 * Nunca vaza stack para o cliente. Erro conhecido devolve a mensagem que o
 * codigo escolheu; erro desconhecido devolve uma frase generica e vai inteiro
 * para o log do servidor, com o request id para amarrar os dois.
 */
@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name)

  catch(excecao: unknown, host: ArgumentsHost): void {
    const contexto = host.switchToHttp()
    const resposta = contexto.getResponse<FastifyReply>()
    const requisicao = contexto.getRequest<FastifyRequest & { requestId?: string }>()
    const requestId = requisicao.requestId ?? 'desconhecido'

    if (excecao instanceof HttpException) {
      const status = excecao.getStatus()
      const detalhe = excecao.getResponse()
      const corpo: CorpoDeErro =
        typeof detalhe === 'object' && detalhe !== null
          ? { statusCode: status, requestId, ...(detalhe as Record<string, unknown>) }
          : { statusCode: status, message: String(detalhe), requestId }

      void resposta.status(status).send(corpo)
      return
    }

    // Desconhecido: o cliente recebe pouco, o log recebe tudo.
    this.logger.error(
      `[${requestId}] ${requisicao.method} ${requisicao.url}`,
      excecao instanceof Error ? excecao.stack : String(excecao),
    )

    const corpo: CorpoDeErro = {
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      message: 'Erro interno',
      requestId,
    }
    void resposta.status(HttpStatus.INTERNAL_SERVER_ERROR).send(corpo)
  }
}
