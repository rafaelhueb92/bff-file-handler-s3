import { Module } from '@nestjs/common';
import { RetryService } from './retry.service';
import { LoggerModule } from '../logger/logger.module';
import { ConfigModule } from '@nestjs/config';

@Module({
  providers: [RetryService],
  imports: [LoggerModule, ConfigModule],
  exports: [RetryService],
})
export class RetryModule {}
