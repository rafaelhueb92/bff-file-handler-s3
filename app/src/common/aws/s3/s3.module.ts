import { Module } from '@nestjs/common';
import { LoggerModule } from '../../logger/logger.module';
import { S3Client as S3_Health } from '@aws-sdk/client-s3';
import { S3Service } from './s3.service';
import { S3 as S3_SDK } from 'aws-sdk';
import { CircuitBreakerModule } from '../../circuit-breaker/circuit-breaker.module';
import { RetryModule } from '../../retry/retry.module';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [LoggerModule, ConfigModule, CircuitBreakerModule, RetryModule],
  providers: [
    S3Service,
    {
      provide: S3_Health,
      useFactory: () => new S3_Health({}),
    },
    {
      provide: S3_SDK,
      useFactory: () => new S3_SDK(),
    },
  ],
  exports: [S3Service],
})
export class S3Module {}
