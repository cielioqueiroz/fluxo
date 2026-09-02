import { Global, Module } from '@nestjs/common'

import { GeminiAdapter } from './gemini.adapter.js'
import { LLM } from './llm.port.js'

/**
 * O provedor de modelo, atras da porta.
 *
 * Global porque insight e RAG precisam dele, e trocar de provedor e trocar a
 * classe nesta linha. Nenhum outro arquivo do projeto importa gemini.adapter.
 */
@Global()
@Module({
  providers: [{ provide: LLM, useClass: GeminiAdapter }],
  exports: [LLM],
})
export class LlmModule {}
