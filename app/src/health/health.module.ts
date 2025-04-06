import { Module } from '@nestjs/common';
import { HealthController } from './health.controller';
import { HealthService } from './health.service';
import { RequestContextModule } from '../common/request-context-module/request-context.module';

@Module({
  controllers: [HealthController],
  imports: [RequestContextModule],
  providers: [HealthService],
  exports: [HealthService],
})
export class HealthModule {}
