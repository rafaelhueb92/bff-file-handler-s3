import { Module } from '@nestjs/common';
import { FilesModule } from './files/files.module';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { BasicAuthGuard } from './common/guards/basic-auth.guard';
import { MulterModule } from './common/multer/multer.module';
import { HealthModule } from './health/health.module';
import { RateLimitInterceptor } from './common/interceptors/rate-limit/rate-limit.interceptor';
import { SystemUsageLimitInterceptor } from './common/interceptors/system-usage-limit/system-usage-limit.interceptor';
import { RequestInterceptor } from './common/interceptors/request/request.interceptor';
import { CircuitBreakerModule } from './common/circuit-breaker/circuit-breaker.module';
import { RetryModule } from './common/retry/retry.module';
import s3Config from './common/config/s3.config';
import retryConfig from './common/config/retry.config';
import { LoggerModule } from './common/logger/logger.module';
import { ContextInterceptor } from './common/context-module/context.interceptor';
import { ContextModule } from './common/context-module/context.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, load: [s3Config, retryConfig] }),
    FilesModule,
    MulterModule,
    HealthModule,
    RetryModule,
    CircuitBreakerModule,
    LoggerModule,
    ContextModule,
  ],
  controllers: [],
  providers: [
    {
      provide: APP_INTERCEPTOR,
      useClass: RateLimitInterceptor,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: ContextInterceptor,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: SystemUsageLimitInterceptor,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: RequestInterceptor,
    },

    {
      provide: APP_GUARD,
      useClass: BasicAuthGuard,
    },
  ],
})
export class AppModule {}
