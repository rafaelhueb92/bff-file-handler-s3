import { Test, TestingModule } from '@nestjs/testing';
import { ExecutionContext, CallHandler } from '@nestjs/common';
import { of, throwError } from 'rxjs';
import { SemaphoreInterceptor } from './semaphore.interceptor';
import { LoggerService } from '../logger/logger.service';
import { SemaphoreService } from './semaphore.service';
import { ServiceUnavailableException } from '@nestjs/common';

describe('SemaphoreInterceptor', () => {
  let interceptor: SemaphoreInterceptor;
  let semaphoreService: jest.Mocked<SemaphoreService>;
  let logger: jest.Mocked<LoggerService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SemaphoreInterceptor,
        {
          provide: SemaphoreService,
          useValue: {
            acquire: jest.fn(),
            getAvailablePermits: jest.fn(),
            getCurrentLoad: jest.fn(),
          },
        },
        {
          provide: LoggerService,
          useValue: {
            info: jest.fn(),
            error: jest.fn(),
            warn: jest.fn(),
          },
        },
      ],
    }).compile();

    interceptor = module.get<SemaphoreInterceptor>(SemaphoreInterceptor);
    semaphoreService = module.get(SemaphoreService);
    logger = module.get(LoggerService);
  });

  const createMockExecutionContext = (): ExecutionContext =>
    ({
      switchToHttp: () => ({
        getRequest: () => ({}),
      }),
    }) as ExecutionContext;

  const createMockCallHandler = (
    response: any = {},
    error?: Error,
  ): CallHandler => ({
    handle: () => (error ? throwError(() => error) : of(response)),
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(interceptor).toBeDefined();
  });

  describe('resource management', () => {
    it('should handle multiple requests correctly', async () => {
      const mockReleaser = jest.fn();
      semaphoreService.acquire.mockResolvedValue([0, mockReleaser]);

      semaphoreService.getAvailablePermits.mockReturnValue(4);
      semaphoreService.getCurrentLoad.mockReturnValue(1);

      const mockContext = createMockExecutionContext();
      const mockCallHandler = createMockCallHandler({ data: 'test' });

      const requests = Array(3)
        .fill(null)
        .map(() => interceptor.intercept(mockContext, mockCallHandler));

      const observables = await Promise.all(requests);

      await Promise.all(
        observables.map(
          (observable) =>
            new Promise<void>((resolve) => {
              observable.subscribe({
                complete: () => resolve(),
              });
            }),
        ),
      );

      expect(semaphoreService.acquire).toHaveBeenCalledTimes(3);
      expect(mockReleaser).toHaveBeenCalledTimes(3);
      expect(semaphoreService.getAvailablePermits).toHaveBeenCalledTimes(6);
      expect(semaphoreService.getCurrentLoad).toHaveBeenCalledTimes(6);
    }, 10000);
  });
});
