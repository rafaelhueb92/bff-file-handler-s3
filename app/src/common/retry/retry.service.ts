import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { LoggerService } from '../logger/logger.service';

export interface RetryOptions {
  retries?: number;
  maxTimeout?: number;
  onFailedAttempt?: (
    error: Error & { attemptNumber: number },
  ) => void | Promise<void>;
}

export interface RetryError extends Error {
  attemptNumber: number;
}

@Injectable()
export class RetryService {
  private readonly retryAttempts: number;
  private readonly maxTimeout: number;

  constructor(
    private readonly logger: LoggerService,
    private readonly configService: ConfigService,
  ) {
    this.retryAttempts = this.configService.get<number>('retry.attempts') || 3;
    this.maxTimeout =
      this.configService.get<number>('retry.maxTimeout') || 10000;
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private createRetryError(error: Error, attempt: number): RetryError {
    const retryError = error as RetryError;
    retryError.attemptNumber = attempt;
    return retryError;
  }

  async execute<T>(
    fn: () => Promise<T>,
    context?: string,
    options?: Partial<RetryOptions>,
  ): Promise<T> {
    const maxAttempts = options?.retries ?? this.retryAttempts;
    const maxTimeout = options?.maxTimeout ?? this.maxTimeout;

    this.logger.info(`This retry will have ${maxAttempts} attempts`);

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        this.logger.info(`Retry Attempt ${attempt}/${maxAttempts}`);
        return await fn();
      } catch (error) {
        const retryError = this.createRetryError(error as Error, attempt);

        if (options?.onFailedAttempt) {
          await options.onFailedAttempt(retryError);
        } else {
          this.logger.warn(
            `[Retry] ${context || 'unknown'} failed (attempt ${attempt}): ${retryError.message}`,
          );
        }

        if (attempt === maxAttempts) {
          throw retryError;
        }

        const delay = Math.min(Math.pow(2, attempt) * 100, maxTimeout);

        await this.delay(delay);
      }
    }
    throw new Error('Unexpected error in retry loop');
  }
}
