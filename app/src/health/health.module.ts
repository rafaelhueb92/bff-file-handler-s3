import { Module } from '@nestjs/common';
import { HealthController } from './health.controller';
import { HealthService } from './health.service';
import { LoggerModule } from '../common/logger/logger.module';
import { S3Module } from '../common/aws/s3/s3.module';

@Module({
  controllers: [HealthController],
  imports: [LoggerModule, S3Module],
  providers: [HealthService],
  exports: [HealthService],
})
export class HealthModule {}
