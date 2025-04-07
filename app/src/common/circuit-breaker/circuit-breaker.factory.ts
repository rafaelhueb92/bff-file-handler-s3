import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as CircuitBreaker from 'opossum';
import { LoggerService } from '../logger/logger.service';

@Injectable()
export class CircuitBreakerFactoryService {
  constructor(
    private readonly configService: ConfigService,
    private readonly logger: LoggerService,
  ) {}

  createBreaker<T extends (...args: any[]) => Promise<any>>(
    action: T,
  ): CircuitBreaker {
    const breaker = new CircuitBreaker(action, {
      timeout:
        this.configService.get<number>('s3.circuitBreaker.timeout') || 30000,
      errorThresholdPercentage:
        this.configService.get<number>('s3.circuitBreaker.errorThreshold') ||
        50,
      resetTimeout:
        this.configService.get<number>('s3.circuitBreaker.resetTimeout') ||
        10000,
    });

    breaker.on('open', () => this.logger.warn('Circuit breaker opened'));
    breaker.on('halfOpen', () => this.logger.warn('Circuit breaker half-open'));
    breaker.on('close', () => this.logger.info('Circuit breaker closed'));

    return breaker;
  }
}
