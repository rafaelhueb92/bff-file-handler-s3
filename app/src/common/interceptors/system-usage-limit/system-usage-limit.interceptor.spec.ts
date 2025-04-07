import { SystemUsageLimitInterceptor } from './system-usage-limit.interceptor';
import { HealthService } from '../../../health/health.service';
import { ExecutionContext, CallHandler } from '@nestjs/common';
import { TooManyRequestsException } from '../../exceptions/too-many-requests.exception';
import { of } from 'rxjs';

describe('SystemUsageLimitInterceptor', () => {
  let interceptor: SystemUsageLimitInterceptor;
  let mockHealthService: Partial<HealthService>;
  let mockContext: ExecutionContext;
  let mockHandler: CallHandler;

  beforeEach(() => {
    mockHealthService = {
      allowRequest: jest.fn(),
    };

    interceptor = new SystemUsageLimitInterceptor(
      mockHealthService as HealthService,
    );

    mockContext = {} as ExecutionContext;
    mockHandler = {
      handle: jest.fn(() => of('OK')),
    };
  });

  it('should allow request when healthService.allowRequest returns true', async () => {
    (mockHealthService.allowRequest as jest.Mock).mockResolvedValue(true);

    const result$ = await interceptor.intercept(mockContext, mockHandler);
    expect(mockHealthService.allowRequest).toHaveBeenCalled();
    expect(mockHandler.handle).toHaveBeenCalled();

    result$.subscribe((res) => {
      expect(res).toBe('OK');
    });
  });

  it('should throw TooManyRequestsException when healthService.allowRequest returns false', async () => {
    (mockHealthService.allowRequest as jest.Mock).mockResolvedValue(false);

    await expect(
      interceptor.intercept(mockContext, mockHandler),
    ).rejects.toThrow(TooManyRequestsException);
  });
});
