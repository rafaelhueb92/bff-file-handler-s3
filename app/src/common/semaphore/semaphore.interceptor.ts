import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
  ServiceUnavailableException,
} from '@nestjs/common';
import { catchError, finalize, Observable, throwError } from 'rxjs';
import { LoggerService } from '../logger/logger.service';
import { SemaphoreService } from './semaphore.service';
import { SemaphoreInterface } from 'async-mutex';

@Injectable()
export class SemaphoreInterceptor implements NestInterceptor {
  constructor(
    private readonly semaphoreService: SemaphoreService,
    private readonly logger: LoggerService,
  ) {}

  async intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Promise<Observable<any>> {
    let releaser: SemaphoreInterface.Releaser | undefined;

    try {
      const [, release] = await this.semaphoreService.acquire();
      releaser = release;

      this.logger.info('Acquired semaphore for file processing', {
        availablePermits: this.semaphoreService.getAvailablePermits(),
        currentLoad: this.semaphoreService.getCurrentLoad(),
      });

      return next.handle().pipe(
        catchError((error) => {
          this.logger.error('Error during file processing', {
            error: error.message,
            availablePermits: this.semaphoreService.getAvailablePermits(),
          });
          return throwError(() => error);
        }),
        finalize(() => {
          if (releaser) {
            releaser();
            this.logger.info('Released semaphore after file processing', {
              availablePermits: this.semaphoreService.getAvailablePermits(),
              currentLoad: this.semaphoreService.getCurrentLoad(),
            });
          }
        }),
      );
    } catch (error) {
      this.logger.error('Failed to acquire semaphore', {
        error: error instanceof Error ? error.message : 'Unknown error',
        availablePermits: this.semaphoreService.getAvailablePermits(),
        currentLoad: this.semaphoreService.getCurrentLoad(),
      });

      throw new ServiceUnavailableException(
        'System is busy processing files. Please try again later.',
      );
    }
  }
}
