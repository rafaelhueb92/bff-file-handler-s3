import { Test, TestingModule } from '@nestjs/testing';
import { SemaphoreService } from './semaphore.service';
import { Semaphore, SemaphoreInterface } from 'async-mutex';

describe('SemaphoreService', () => {
  let service: SemaphoreService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [SemaphoreService],
    }).compile();

    service = module.get<SemaphoreService>(SemaphoreService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('initialization', () => {
    it('should initialize with correct max concurrent value', () => {
      expect(service.getMaxConcurrent()).toBe(5);
    });

    it('should initialize with all permits available', () => {
      expect(service.getAvailablePermits()).toBe(5);
    });

    it('should initialize with zero current load', () => {
      expect(service.getCurrentLoad()).toBe(0);
    });
  });

  describe('acquire and release', () => {
    it('should handle multiple acquire and release operations', async () => {
      const [, releaser1] = await service.acquire();
      const [, releaser2] = await service.acquire();

      expect(service.getAvailablePermits()).toBe(3);
      expect(service.getCurrentLoad()).toBe(2);

      await releaser1();
      expect(service.getAvailablePermits()).toBe(4);
      expect(service.getCurrentLoad()).toBe(1);

      await releaser2();
      expect(service.getAvailablePermits()).toBe(5);
      expect(service.getCurrentLoad()).toBe(0);
    });

    it('should handle concurrent acquisitions up to max limit', async () => {
      const acquisitions: Promise<[number, SemaphoreInterface.Releaser]>[] = [];

      for (let i = 0; i < 5; i++) {
        acquisitions.push(service.acquire());
      }

      const results = await Promise.all(acquisitions);
      expect(service.getAvailablePermits()).toBe(0);
      expect(service.getCurrentLoad()).toBe(5);

      // Release all permits
      await Promise.all(results.map(([, releaser]) => releaser()));
      expect(service.getAvailablePermits()).toBe(5);
      expect(service.getCurrentLoad()).toBe(0);
    });

    it('should queue acquisitions beyond max limit', async () => {
      const releasers: SemaphoreInterface.Releaser[] = [];

      // Acquire all available permits
      for (let i = 0; i < service.getMaxConcurrent(); i++) {
        const [, releaser] = await service.acquire();
        releasers.push(releaser);
      }

      expect(service.getAvailablePermits()).toBe(0);

      // Try to acquire one more (should be queued)
      const extraAcquisitionPromise = service.acquire();

      // Release one permit
      await releasers[0]();

      // The queued acquisition should now complete
      const [, extraReleaser] = await extraAcquisitionPromise;
      expect(service.getAvailablePermits()).toBe(0);

      // Cleanup
      await extraReleaser();
      await Promise.all(releasers.slice(1).map((releaser) => releaser()));
    });
  });

  describe('metrics', () => {
    it('should correctly track available permits', async () => {
      expect(service.getAvailablePermits()).toBe(5);

      const [, releaser] = await service.acquire();
      expect(service.getAvailablePermits()).toBe(4);

      await releaser();
      expect(service.getAvailablePermits()).toBe(5);
    });

    it('should correctly track current load', async () => {
      expect(service.getCurrentLoad()).toBe(0);

      const [, releaser] = await service.acquire();
      expect(service.getCurrentLoad()).toBe(1);

      await releaser();
      expect(service.getCurrentLoad()).toBe(0);
    });

    it('should maintain consistent state after multiple operations', async () => {
      const releasers: SemaphoreInterface.Releaser[] = [];

      // Acquire 3 permits
      for (let i = 0; i < 3; i++) {
        const [, releaser] = await service.acquire();
        releasers.push(releaser);
      }

      expect(service.getAvailablePermits()).toBe(2);
      expect(service.getCurrentLoad()).toBe(3);

      // Release 2 permits
      await releasers[0]();
      await releasers[1]();

      expect(service.getAvailablePermits()).toBe(4);
      expect(service.getCurrentLoad()).toBe(1);

      // Release last permit
      await releasers[2]();

      expect(service.getAvailablePermits()).toBe(5);
      expect(service.getCurrentLoad()).toBe(0);
    });
  });

  describe('error handling', () => {
    it('should handle releaser being called multiple times', async () => {
      const [, releaser] = await service.acquire();

      await releaser();
      await releaser(); // Should not throw or affect counts

      expect(service.getAvailablePermits()).toBe(5);
      expect(service.getCurrentLoad()).toBe(0);
    });

    it('should maintain correct state after errors', async () => {
      const [, releaser1] = await service.acquire();
      const [, releaser2] = await service.acquire();

      try {
        throw new Error('Test error');
      } catch (error) {
        await releaser1();
        await releaser2();
      }

      expect(service.getAvailablePermits()).toBe(5);
      expect(service.getCurrentLoad()).toBe(0);
    });
  });
});
