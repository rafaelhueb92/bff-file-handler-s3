import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { FilesModule } from './files/files.module';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { BasicAuthGuard } from './common/guards/basic-auth.guard';
import { MulterModule } from './common/multer/multer.module';
import { HealthModule } from './health/health.module';
import { RequestInterceptor } from './common/interceptors/request/request.interceptor';
import { CircuitBreakerModule } from './common/circuit-breaker/circuit-breaker.module';
import { RetryModule } from './common/retry/retry.module';
import s3Config from './common/config/s3.config';
import retryConfig from './common/config/retry.config';
import { LoggerModule } from './common/logger/logger.module';
import { ContextInterceptor } from './common/context-module/context.interceptor';
import { ContextModule } from './common/context-module/context.module';
import { RateLimitMiddleware } from './common/middlewares/rate-limit/rate-limit.middleware';
import { SystemUsageLimitMiddleware } from './common/middlewares/system-usage-limit/system-usage-limit.middleware';
import { SpaceReservedMiddleware } from './common/middlewares/space-reserved/space-reserved.middleware';
import { SemaphoreModule } from './common/semaphore/semaphore.module';
import { SemaphoreInterceptor } from './common/semaphore/semaphore.interceptor';

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
    SemaphoreModule,
  ],
  controllers: [],
  providers: [
    {
      provide: APP_INTERCEPTOR,
      useClass: RequestInterceptor,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: SemaphoreInterceptor,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: ContextInterceptor,
    },
    {
      provide: APP_GUARD,
      useClass: BasicAuthGuard,
    },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(RateLimitMiddleware).forRoutes('*');
    consumer.apply(SystemUsageLimitMiddleware).forRoutes('*');
    consumer.apply(SpaceReservedMiddleware).forRoutes('*');
  }
}
