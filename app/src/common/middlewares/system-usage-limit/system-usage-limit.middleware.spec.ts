import { Test, TestingModule } from '@nestjs/testing';
import { SystemUsageLimitMiddleware } from './system-usage-limit.middleware';
import { HealthService } from '../../../health/health.service';
import { TooManyRequestsException } from '../../exceptions/too-many-requests.exception';

describe('SystemUsageLimitMiddleware', () => {
  let middleware: SystemUsageLimitMiddleware;
  let healthService: jest.Mocked<HealthService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SystemUsageLimitMiddleware,
        {
          provide: HealthService,
          useValue: {
            allowRequest: jest.fn(),
          },
        },
      ],
    }).compile();

    middleware = module.get<SystemUsageLimitMiddleware>(
      SystemUsageLimitMiddleware,
    );
    healthService = module.get(HealthService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  const mockRequest = {};
  const mockResponse = {};
  const mockNext = jest.fn();

  it('should be defined', () => {
    expect(middleware).toBeDefined();
  });

  describe('request handling', () => {
    it('should allow request when system usage is within limits', async () => {
      healthService.allowRequest.mockResolvedValue(true);

      await middleware.use(mockRequest, mockResponse, mockNext);

      expect(healthService.allowRequest).toHaveBeenCalled();
      expect(mockNext).toHaveBeenCalled();
    });

    it('should throw TooManyRequestsException when system usage limit is reached', async () => {
      healthService.allowRequest.mockResolvedValue(false);

      await expect(
        middleware.use(mockRequest, mockResponse, mockNext),
      ).rejects.toThrow(
        new TooManyRequestsException('Usage Rate limit reached'),
      );

      expect(healthService.allowRequest).toHaveBeenCalled();
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should handle health service errors', async () => {
      const error = new Error('Health service error');
      healthService.allowRequest.mockRejectedValue(error);

      await expect(
        middleware.use(mockRequest, mockResponse, mockNext),
      ).rejects.toThrow(error);

      expect(healthService.allowRequest).toHaveBeenCalled();
      expect(mockNext).not.toHaveBeenCalled();
    });
  });

  describe('error handling', () => {
    it('should propagate health service errors', async () => {
      const error = new Error('Health service error');
      healthService.allowRequest.mockRejectedValue(error);

      await expect(
        middleware.use(mockRequest, mockResponse, mockNext),
      ).rejects.toThrow('Health service error');
    });

    it('should throw correct error type for rate limit', async () => {
      healthService.allowRequest.mockResolvedValue(false);

      try {
        await middleware.use(mockRequest, mockResponse, mockNext);
      } catch (error) {
        expect(error).toBeInstanceOf(TooManyRequestsException);
        expect(error.message).toBe('Usage Rate limit reached');
      }
    });
  });

  describe('middleware behavior', () => {
    it('should call health service exactly once per request', async () => {
      healthService.allowRequest.mockResolvedValue(true);

      await middleware.use(mockRequest, mockResponse, mockNext);

      expect(healthService.allowRequest).toHaveBeenCalledTimes(1);
    });

    it('should handle multiple sequential requests correctly', async () => {
      healthService.allowRequest
        .mockResolvedValueOnce(true)
        .mockResolvedValueOnce(false)
        .mockResolvedValueOnce(true);

      // First request should succeed
      await middleware.use(mockRequest, mockResponse, mockNext);
      expect(mockNext).toHaveBeenCalledTimes(1);

      // Second request should fail
      await expect(
        middleware.use(mockRequest, mockResponse, mockNext),
      ).rejects.toThrow(TooManyRequestsException);

      // Third request should succeed
      await middleware.use(mockRequest, mockResponse, mockNext);
      expect(mockNext).toHaveBeenCalledTimes(2);
    });

    it('should not call next() when request is not allowed', async () => {
      healthService.allowRequest.mockResolvedValue(false);

      try {
        await middleware.use(mockRequest, mockResponse, mockNext);
      } catch (error) {
        expect(mockNext).not.toHaveBeenCalled();
      }
    });
  });

  describe('edge cases', () => {
    it('should handle undefined response from health service', async () => {
      healthService.allowRequest.mockResolvedValue(undefined as any);

      await expect(
        middleware.use(mockRequest, mockResponse, mockNext),
      ).rejects.toThrow(TooManyRequestsException);
    });

    it('should handle null response from health service', async () => {
      healthService.allowRequest.mockResolvedValue(null as any);

      await expect(
        middleware.use(mockRequest, mockResponse, mockNext),
      ).rejects.toThrow(TooManyRequestsException);
    });
  });
});
