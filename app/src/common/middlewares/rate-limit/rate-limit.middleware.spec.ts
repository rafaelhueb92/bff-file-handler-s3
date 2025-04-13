import { Test, TestingModule } from '@nestjs/testing';
import { Request, Response } from 'express';
import { RateLimitMiddleware } from './rate-limit.middleware';
import { ContextService } from '../../context-module/context.service';
import { LoggerService } from '../../logger/logger.service';
import { TooManyRequestsException } from '../../exceptions/too-many-requests.exception';

describe('RateLimitMiddleware', () => {
  let middleware: RateLimitMiddleware;
  let logger: jest.Mocked<LoggerService>;
  let contextService: jest.Mocked<ContextService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RateLimitMiddleware,
        {
          provide: LoggerService,
          useValue: {
            info: jest.fn(),
            error: jest.fn(),
            warn: jest.fn(),
            debug: jest.fn(),
          },
        },
        {
          provide: ContextService,
          useValue: {
            set: jest.fn(),
          },
        },
      ],
    }).compile();

    middleware = module.get<RateLimitMiddleware>(RateLimitMiddleware);
    logger = module.get(LoggerService);
    contextService = module.get(ContextService);

    // Mock console.error
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.clearAllMocks();
    (middleware as any).requestsMap.clear();
  });

  const createMockRequest = (ip: string): Request =>
    ({
      ip,
      header: {
        'x-forwarded-for': `${ip},123,444`,
        'x-real-ip': ip,
      },
    }) as unknown as Request;

  const mockResponse = {} as Response;
  const mockNext = jest.fn();

  it('should be defined', () => {
    expect(middleware).toBeDefined();
  });

  describe('rate limiting', () => {
    it('should allow first request from an IP', () => {
      const mockRequest = createMockRequest('127.0.0.1');

      expect(() =>
        middleware.use(mockRequest, mockResponse, mockNext),
      ).not.toThrow();
      expect(mockNext).toHaveBeenCalled();
      expect(contextService.set).toHaveBeenCalledWith('ip', '127.0.0.1');
      expect(logger.info).toHaveBeenCalledWith(
        '127.0.0.1 is trying to request.',
      );
    });

    it('should block repeated requests within 10 seconds', () => {
      const mockRequest = createMockRequest('127.0.0.1');

      // First request
      middleware.use(mockRequest, mockResponse, mockNext);

      // Second request immediately after
      expect(() => middleware.use(mockRequest, mockResponse, mockNext)).toThrow(
        new TooManyRequestsException('Too Many Requests. Wait 10 seconds.'),
      );

      expect(console.error).toHaveBeenCalledWith(
        'Too Many Requests. Wait 10 seconds.',
      );
    });

    it('should allow requests after 10 seconds', () => {
      const mockRequest = createMockRequest('127.0.0.1');

      // Mock Date.now
      const originalDateNow = Date.now;
      let currentTime = 1000000;
      Date.now = jest.fn(() => currentTime);

      // First request
      middleware.use(mockRequest, mockResponse, mockNext);

      // Advance time by 11 seconds
      currentTime += 11000;

      // Second request after 11 seconds
      expect(() =>
        middleware.use(mockRequest, mockResponse, mockNext),
      ).not.toThrow();
      expect(mockNext).toHaveBeenCalledTimes(2);

      // Restore original Date.now
      Date.now = originalDateNow;
    });

    it('should handle different IPs independently', () => {
      const mockRequest1 = createMockRequest('127.0.0.1');
      const mockRequest2 = createMockRequest('127.0.0.2');

      // First request from IP1
      middleware.use(mockRequest1, mockResponse, mockNext);

      // Request from IP2 should be allowed
      expect(() =>
        middleware.use(mockRequest2, mockResponse, mockNext),
      ).not.toThrow();
      expect(mockNext).toHaveBeenCalledTimes(2);
    });

    it('should handle missing IP address', () => {
      const mockRequest = createMockRequest('');

      expect(() =>
        middleware.use(mockRequest, mockResponse, mockNext),
      ).not.toThrow();
      expect(contextService.set).toHaveBeenCalledWith('ip', '');
      expect(logger.info).toHaveBeenCalledWith(' is trying to request.');
    });

    it('should maintain rate limit state between requests', () => {
      const mockRequest = createMockRequest('127.0.0.1');

      // First request
      middleware.use(mockRequest, mockResponse, mockNext);

      // Verify the state was stored
      expect((middleware as any).requestsMap.has('127.0.0.1')).toBeTruthy();

      // Second request should be blocked
      expect(() => middleware.use(mockRequest, mockResponse, mockNext)).toThrow(
        TooManyRequestsException,
      );
    });

    it('should clean up old entries', () => {
      const mockRequest = createMockRequest('127.0.0.1');

      // Mock Date.now
      const originalDateNow = Date.now;
      let currentTime = 1000000;
      Date.now = jest.fn(() => currentTime);

      // First request
      middleware.use(mockRequest, mockResponse, mockNext);

      // Advance time significantly
      currentTime += 20000;

      // Second request should be allowed
      expect(() =>
        middleware.use(mockRequest, mockResponse, mockNext),
      ).not.toThrow();
      expect(mockNext).toHaveBeenCalledTimes(2);

      // Restore original Date.now
      Date.now = originalDateNow;
    });
  });

  describe('context and logging', () => {
    it('should set IP in context service', () => {
      const mockRequest = createMockRequest('127.0.0.1');

      middleware.use(mockRequest, mockResponse, mockNext);

      expect(contextService.set).toHaveBeenCalledWith('ip', '127.0.0.1');
    });

    it('should log request attempts', () => {
      const mockRequest = createMockRequest('127.0.0.1');

      middleware.use(mockRequest, mockResponse, mockNext);

      expect(logger.info).toHaveBeenCalledWith(
        '127.0.0.1 is trying to request.',
      );
    });

    it('should log rate limit violations', () => {
      const mockRequest = createMockRequest('127.0.0.1');

      middleware.use(mockRequest, mockResponse, mockNext);

      expect(() =>
        middleware.use(mockRequest, mockResponse, mockNext),
      ).toThrow();
      expect(console.error).toHaveBeenCalledWith(
        'Too Many Requests. Wait 10 seconds.',
      );
    });
  });
});
