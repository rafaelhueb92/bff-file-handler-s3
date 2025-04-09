import { Module } from '@nestjs/common';
import { LoggerModule } from '../../logger/logger.module';
import { S3Client as S3_Health } from '@aws-sdk/client-s3';
import { S3Service } from './s3.service';
import { S3 as S3_SDK } from 'aws-sdk';
import { CircuitBreakerModule } from '../../circuit-breaker/circuit-breaker.module';
import { RetryModule } from '../../retry/retry.module';
import { ConfigModule } from '@nestjs/config';
import { S3ServiceCB } from './s3.service.cb';

@Module({
  imports: [LoggerModule, ConfigModule, CircuitBreakerModule, RetryModule],
  providers: [
    S3Service,
    S3ServiceCB,
    {
      provide: S3_Health,
      useFactory: () => new S3_Health({}),
    },
    {
      provide: S3_SDK,
      useFactory: () =>
        new S3_SDK({
          httpOptions: {
            timeout: parseInt(process.env.S3_TIME_OUT! || '300000'),
            connectTimeout: parseInt(process.env.S3_CONN_TIME_OUT || '60000'),
          },
        }),
    },
  ],
  exports: [S3Service, S3ServiceCB],
})
export class S3Module {}
