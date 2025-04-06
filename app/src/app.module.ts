import { Module } from '@nestjs/common';
import { FilesModule } from './files/files.module';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { BasicAuthGuard } from './common/guards/basic-auth.guard';
import { MulterModule } from './multer/multer.module';
import { HealthModule } from './health/health.module';
import { RateLimitInterceptor } from './common/interceptors/rate-limit/rate-limit.interceptor';
import { SystemUsageLimitInterceptor } from './common/interceptors/system-usage-limit/system-usage-limit.interceptor';

@Module({
  imports: [ConfigModule.forRoot(), FilesModule, MulterModule, HealthModule],
  controllers: [],
  providers: [
    {
      provide: APP_INTERCEPTOR,
      useClass: RateLimitInterceptor,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: SystemUsageLimitInterceptor,
    },
    {
      provide: APP_GUARD,
      useClass: BasicAuthGuard,
    },
  ],
})
export class AppModule {}
