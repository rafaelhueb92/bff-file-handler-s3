import { Injectable } from '@nestjs/common';
import { Semaphore, SemaphoreInterface } from 'async-mutex';

@Injectable()
export class SemaphoreService {
  private readonly maxConcurrent = 5;
  private currentPermits = this.maxConcurrent;
  private readonly semaphore: Semaphore;

  constructor() {
    this.semaphore = new Semaphore(this.maxConcurrent);
  }

  async acquire(): Promise<[number, SemaphoreInterface.Releaser]> {
    const [value, originalReleaser] = await this.semaphore.acquire();

    let released = false;
    const wrappedReleaser = () => {
      if (!released) {
        released = true;
        this.currentPermits++;
        return originalReleaser();
      }
      return Promise.resolve();
    };

    this.currentPermits--;
    return [value, wrappedReleaser];
  }

  getAvailablePermits(): number {
    return this.currentPermits;
  }

  getMaxConcurrent(): number {
    return this.maxConcurrent;
  }

  getCurrentLoad(): number {
    return this.maxConcurrent - this.currentPermits;
  }
}
