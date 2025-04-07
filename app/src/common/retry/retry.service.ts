import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import pRetry, { Options } from 'p-retry';
import { LoggerService } from '../logger/logger.service';

@Injectable()
export class RetryService {
  private readonly retryAttempts: number;

  constructor(
    private readonly logger: LoggerService,
    private readonly configService: ConfigService,
  ) {
    this.retryAttempts = this.configService.get<number>('retry.attempts') || 3;
  }

  async execute<T>(
    fn: () => Promise<T>,
    context?: string,
    options?: Partial<Options>,
  ): Promise<T> {
    this.logger.info(`This retry will have ${this.retryAttempts} attempts`);
    return await pRetry(fn, {
      retries: this.retryAttempts,
      maxTimeout: this.configService.get<number>('retry.maxTimeout') || 10000,
      onFailedAttempt: (error) => {
        this.logger.warn(
          `[Retry] ${context || 'unknown'} failed (attempt ${error.attemptNumber}): ${error.message}`,
        );
      },
      ...options,
    });
  }
}
