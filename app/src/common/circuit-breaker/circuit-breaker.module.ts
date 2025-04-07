import { Module } from '@nestjs/common';
import { CircuitBreakerFactoryService } from './circuit-breaker.factory';
import { LoggerModule } from '../logger/logger.module';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [ConfigModule, LoggerModule],
  providers: [CircuitBreakerFactoryService],
  exports: [CircuitBreakerFactoryService],
})
export class CircuitBreakerModule {}
