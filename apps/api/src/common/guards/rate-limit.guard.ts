import {
  HttpException,
  HttpStatus,
  Inject,
  Injectable,
  type CanActivate,
  type ExecutionContext,
} from '@nestjs/common'
import type { FastifyRequest } from 'fastify'

import { ENV } from '../../config/config.module.js'
import type { Env } from '../../config/env.schema.js'

interface Janela {
  contagem: number
  expiraEm: number
}

/**
 * Rate limit por endereco, em memoria.
 *
 * Memoria e nao Redis de proposito: a regra 1 do AGENTS.md proibe servico pago,
 * e o plano gratuito do Render roda uma instancia so. Um contador em memoria
 * protege exatamente o que precisa ser protegido, que e a cota gratuita do
 * provedor de modelo, e nao pretende ser mais do que isso.
 *
 * Se um dia houver mais de uma instancia, esta guarda vira um limite por
 * instancia, e o lugar de corrigir isso e aqui, com um ADR novo.
 */
@Injectable()
export class RateLimitGuard implements CanActivate {
  private readonly janelas = new Map<string, Janela>()
  private ultimaLimpeza = Date.now()

  constructor(@Inject(ENV) private readonly env: Env) {}

  canActivate(contexto: ExecutionContext): boolean {
    const requisicao = contexto.switchToHttp().getRequest<FastifyRequest>()
    const chave = this.identificar(requisicao)
    const agora = Date.now()

    this.limpar(agora)

    const janela = this.janelas.get(chave)
    if (janela === undefined || janela.expiraEm <= agora) {
      this.janelas.set(chave, { contagem: 1, expiraEm: agora + this.env.RATE_LIMIT_WINDOW_MS })
      return true
    }

    janela.contagem += 1
    if (janela.contagem > this.env.RATE_LIMIT_MAX) {
      const segundos = Math.ceil((janela.expiraEm - agora) / 1000)
      throw new HttpException(
        { message: `Muitas requisicoes. Tente de novo em ${String(segundos)}s.` },
        HttpStatus.TOO_MANY_REQUESTS,
      )
    }
    return true
  }

  /** Respeita `x-forwarded-for`, porque no Render a API fica atras de proxy. */
  private identificar(requisicao: FastifyRequest): string {
    const encaminhado = requisicao.headers['x-forwarded-for']
    if (typeof encaminhado === 'string' && encaminhado !== '') {
      return encaminhado.split(',')[0]?.trim() ?? requisicao.ip
    }
    return requisicao.ip
  }

  /** Varre janelas vencidas de vez em quando, para o mapa nao crescer sem fim. */
  private limpar(agora: number): void {
    if (agora - this.ultimaLimpeza < this.env.RATE_LIMIT_WINDOW_MS) {
      return
    }
    for (const [chave, janela] of this.janelas) {
      if (janela.expiraEm <= agora) {
        this.janelas.delete(chave)
      }
    }
    this.ultimaLimpeza = agora
  }
}
