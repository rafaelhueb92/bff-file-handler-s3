import { Module } from '@nestjs/common';
import { SemaphoreService } from './semaphore.service';
import { Semaphore } from 'async-mutex';

@Module({
  providers: [
    SemaphoreService,
    {
      provide: Semaphore,
      useFactory: () => new Semaphore(5),
    },
  ],
  exports: [SemaphoreService],
})
export class SemaphoreModule {}
