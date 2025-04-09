import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { RetryService, RetryError } from './retry.service';
import { LoggerService } from '../logger/logger.service';

describe('RetryService', () => {
  let service: RetryService;
  let logger: jest.Mocked<LoggerService>;
  let configService: jest.Mocked<ConfigService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RetryService,
        {
          provide: LoggerService,
          useValue: {
            info: jest.fn(),
            warn: jest.fn(),
            error: jest.fn(),
          },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<RetryService>(RetryService);
    logger = module.get(LoggerService);
    configService = module.get(ConfigService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('initialization', () => {
    it('should use default values when config is not provided', () => {
      configService.get.mockReturnValue(undefined);
      const newService = new RetryService(logger, configService);
      expect((newService as any).retryAttempts).toBe(3);
      expect((newService as any).maxTimeout).toBe(10000);
    });

    it('should use config values when provided', () => {
      configService.get.mockReturnValueOnce(5).mockReturnValueOnce(20000);

      const newService = new RetryService(logger, configService);
      expect((newService as any).retryAttempts).toBe(5);
      expect((newService as any).maxTimeout).toBe(20000);
    });
  });

  describe('execute', () => {
    it('should succeed on first attempt', async () => {
      const fn = jest.fn().mockResolvedValue('success');
      const result = await service.execute(fn, 'test');

      expect(result).toBe('success');
      expect(fn).toHaveBeenCalledTimes(1);
      expect(logger.info).toHaveBeenCalledWith('Retry Attempt 1/3');
    });

    it('should retry once and succeed', async () => {
      const fn = jest
        .fn()
        .mockRejectedValueOnce(new Error('first failure'))
        .mockResolvedValueOnce('success');

      const result = await service.execute(fn, 'test');

      expect(result).toBe('success');
      expect(fn).toHaveBeenCalledTimes(2);
      expect(logger.info).toHaveBeenCalledWith('Retry Attempt 1/3');
      expect(logger.info).toHaveBeenCalledWith('Retry Attempt 2/3');
      expect(logger.warn).toHaveBeenCalledWith(
        '[Retry] test failed (attempt 1): first failure',
      );
    });

    it('should retry twice and succeed', async () => {
      const fn = jest
        .fn()
        .mockRejectedValueOnce(new Error('first failure'))
        .mockRejectedValueOnce(new Error('second failure'))
        .mockResolvedValueOnce('success');

      const result = await service.execute(fn, 'test');

      expect(result).toBe('success');
      expect(fn).toHaveBeenCalledTimes(3);
      expect(logger.warn).toHaveBeenCalledWith(
        '[Retry] test failed (attempt 1): first failure',
      );
      expect(logger.warn).toHaveBeenCalledWith(
        '[Retry] test failed (attempt 2): second failure',
      );
    });

    it('should fail after all retries', async () => {
      const fn = jest.fn().mockRejectedValue(new Error('persistent failure'));

      await expect(service.execute(fn, 'test')).rejects.toThrow(
        'persistent failure',
      );

      expect(fn).toHaveBeenCalledTimes(3);
      expect(logger.info).toHaveBeenCalledWith(
        'This retry will have 3 attempts',
      );
    });

    it('should respect custom retry options', async () => {
      const fn = jest.fn().mockRejectedValue(new Error('fail'));
      const options = { retries: 2 };

      await expect(service.execute(fn, 'test', options)).rejects.toThrow(
        'fail',
      );

      expect(fn).toHaveBeenCalledTimes(2);
      expect(logger.info).toHaveBeenCalledWith(
        'This retry will have 2 attempts',
      );
    });

    it('should call onFailedAttempt when provided', async () => {
      const onFailedAttempt = jest.fn();
      const fn = jest
        .fn()
        .mockRejectedValueOnce(new Error('fail'))
        .mockResolvedValueOnce('success');

      await service.execute(fn, 'test', { onFailedAttempt });

      expect(onFailedAttempt).toHaveBeenCalledTimes(1);
      expect(onFailedAttempt).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'fail',
          attemptNumber: 1,
        }),
      );
    });

    it('should include attempt number in error', async () => {
      const fn = jest.fn().mockRejectedValue(new Error('fail'));

      try {
        await service.execute(fn, 'test');
      } catch (error) {
        expect(error).toHaveProperty('attemptNumber', 3);
      }

      expect(fn).toHaveBeenCalledTimes(3);
    });

    it('should handle undefined context', async () => {
      const fn = jest
        .fn()
        .mockRejectedValueOnce(new Error('fail'))
        .mockResolvedValueOnce('success');

      await service.execute(fn);

      expect(logger.warn).toHaveBeenCalledWith(
        '[Retry] unknown failed (attempt 1): fail',
      );
    });

    it('should handle async onFailedAttempt', async () => {
      const onFailedAttempt = jest
        .fn()
        .mockImplementation(() => Promise.resolve());
      const fn = jest
        .fn()
        .mockRejectedValueOnce(new Error('fail'))
        .mockResolvedValueOnce('success');

      await service.execute(fn, 'test', { onFailedAttempt });

      expect(onFailedAttempt).toHaveBeenCalledTimes(1);
      expect(onFailedAttempt).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'fail',
          attemptNumber: 1,
        }),
      );
    });
  });

  describe('delay behavior', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should delay between retries', async () => {
      const fn = jest
        .fn()
        .mockRejectedValueOnce(new Error('first failure'))
        .mockResolvedValueOnce('success');

      const executePromise = service.execute(fn, 'test');

      // First attempt fails immediately
      await jest.runOnlyPendingTimers();

      // Should wait for the delay before second attempt
      expect(fn).toHaveBeenCalledTimes(1);

      // Advance timers to trigger second attempt
      await jest.runAllTimers();
      await executePromise;

      expect(fn).toHaveBeenCalledTimes(2);
    });
  });
});
