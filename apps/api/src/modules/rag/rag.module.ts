import { Module } from '@nestjs/common'

import { EmbeddingService } from './embedding.service.js'
import { RagService } from './rag.service.js'
import { RerankService } from './rerank.service.js'
import { RetrievalService } from './retrieval.service.js'

@Module({
  providers: [EmbeddingService, RetrievalService, RerankService, RagService],
  exports: [RagService, EmbeddingService],
})
export class RagModule {}
