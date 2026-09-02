import { Module } from '@nestjs/common'
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core'

import { HttpExceptionFilter } from './common/filters/http-exception.filter.js'
import { RateLimitGuard } from './common/guards/rate-limit.guard.js'
import { RequestIdInterceptor } from './common/interceptors/request-id.interceptor.js'
import { ConfigModule } from './config/config.module.js'
import { DatabaseModule } from './database/database.module.js'
import { HealthModule } from './modules/health/health.module.js'
import { InsightModule } from './modules/insight/insight.module.js'
import { LlmModule } from './modules/llm/llm.module.js'
import { SimulationModule } from './modules/simulation/simulation.module.js'

@Module({
  imports: [ConfigModule, DatabaseModule, LlmModule, HealthModule, SimulationModule, InsightModule],
  providers: [
    { provide: APP_FILTER, useClass: HttpExceptionFilter },
    { provide: APP_INTERCEPTOR, useClass: RequestIdInterceptor },
    { provide: APP_GUARD, useClass: RateLimitGuard },
  ],
})
export class AppModule {}
