import { Module } from '@nestjs/common'

import { RagModule } from '../rag/rag.module.js'
import { InsightCache } from './insight.cache.js'
import { InsightController } from './insight.controller.js'
import { InsightService } from './insight.service.js'

@Module({
  imports: [RagModule],
  controllers: [InsightController],
  providers: [InsightService, InsightCache],
})
export class InsightModule {}
