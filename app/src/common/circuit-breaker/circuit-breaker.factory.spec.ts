import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { LoggerService } from '../logger/logger.service';
import { CircuitBreakerFactoryService } from './circuit-breaker.factory';
import * as CircuitBreaker from 'opossum';

jest.mock('opossum');

describe('CircuitBreakerFactoryService', () => {
  let service: CircuitBreakerFactoryService;
  let configService: jest.Mocked<ConfigService>;
  let logger: jest.Mocked<LoggerService>;
  let mockCircuitBreaker: jest.Mocked<CircuitBreaker>;

  beforeEach(async () => {
    mockCircuitBreaker = {
      on: jest.fn(),
      fire: jest.fn(),
      fallback: jest.fn(),
      opened: false,
      closed: true,
      halfOpen: false,
    } as any;

    (CircuitBreaker as unknown as jest.Mock).mockImplementation(
      () => mockCircuitBreaker,
    );

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CircuitBreakerFactoryService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn(),
          },
        },
        {
          provide: LoggerService,
          useValue: {
            warn: jest.fn(),
            info: jest.fn(),
            error: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<CircuitBreakerFactoryService>(
      CircuitBreakerFactoryService,
    );
    configService = module.get(ConfigService) as jest.Mocked<ConfigService>;
    logger = module.get(LoggerService) as jest.Mocked<LoggerService>;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createBreaker', () => {
    const mockAction = jest.fn();

    it('should create a circuit breaker with default values when no config is provided', () => {
      configService.get.mockReturnValue(undefined);

      const breaker = service.createBreaker(mockAction);

      expect(CircuitBreaker).toHaveBeenCalledWith(mockAction, {
        timeout: 30000,
        errorThresholdPercentage: 50,
        resetTimeout: 10000,
      });

      expect(breaker).toBeDefined();
    });

    it('should create a circuit breaker with custom config values', () => {
      configService.get.mockImplementation((key: string) => {
        const config = {
          's3.circuitBreaker.timeout': 5000,
          's3.circuitBreaker.errorThreshold': 75,
          's3.circuitBreaker.resetTimeout': 15000,
        };
        return config[key];
      });

      const breaker = service.createBreaker(mockAction);

      expect(CircuitBreaker).toHaveBeenCalledWith(mockAction, {
        timeout: 5000,
        errorThresholdPercentage: 75,
        resetTimeout: 15000,
      });

      expect(breaker).toBeDefined();
    });

    it('should register event handlers for open, halfOpen, and close events', () => {
      service.createBreaker(mockAction);

      expect(mockCircuitBreaker.on).toHaveBeenCalledTimes(3);
      expect(mockCircuitBreaker.on).toHaveBeenCalledWith(
        'open',
        expect.any(Function),
      );
      expect(mockCircuitBreaker.on).toHaveBeenCalledWith(
        'halfOpen',
        expect.any(Function),
      );
      expect(mockCircuitBreaker.on).toHaveBeenCalledWith(
        'close',
        expect.any(Function),
      );
    });

    it('should log appropriate messages when circuit breaker events are triggered', () => {
      service.createBreaker(mockAction);

      const [[, openHandler], [, halfOpenHandler], [, closeHandler]] = (
        mockCircuitBreaker.on as jest.Mock
      ).mock.calls;

      openHandler();
      halfOpenHandler();
      closeHandler();

      expect(logger.warn).toHaveBeenCalledWith('Circuit breaker opened');
      expect(logger.warn).toHaveBeenCalledWith('Circuit breaker half-open');
      expect(logger.info).toHaveBeenCalledWith('Circuit breaker closed');
    });

    it('should properly handle async actions', async () => {
      const asyncAction = jest.fn().mockResolvedValue('success');
      const breaker = service.createBreaker(asyncAction);

      mockCircuitBreaker.fire.mockResolvedValue('success');

      const result = await breaker.fire();

      expect(result).toBe('success');
    });

    it('should handle errors in async actions', async () => {
      const error = new Error('Test error');
      const asyncAction = jest.fn().mockRejectedValue(error);
      const breaker = service.createBreaker(asyncAction);

      mockCircuitBreaker.fire.mockRejectedValue(error);

      await expect(breaker.fire()).rejects.toThrow('Test error');
    });

    describe('Circuit Breaker State', () => {
      it('should report correct state when circuit is opened', () => {
        const breaker = service.createBreaker(mockAction);
        Object.defineProperty(mockCircuitBreaker, 'opened', {
          get: () => true,
        });
        Object.defineProperty(mockCircuitBreaker, 'closed', {
          get: () => false,
        });

        expect(breaker.opened).toBe(true);
        expect(breaker.closed).toBe(false);
      });

      it('should report correct state when circuit is closed', () => {
        const breaker = service.createBreaker(mockAction);
        Object.defineProperty(mockCircuitBreaker, 'opened', {
          get: () => false,
        });
        Object.defineProperty(mockCircuitBreaker, 'closed', {
          get: () => true,
        });

        expect(breaker.opened).toBe(false);
        expect(breaker.closed).toBe(true);
      });

      it('should report correct state when circuit is half-open', () => {
        const breaker = service.createBreaker(mockAction);
        Object.defineProperty(mockCircuitBreaker, 'halfOpen', {
          get: () => true,
        });

        expect(breaker.halfOpen).toBe(true);
      });
    });

    describe('Event Handlers', () => {
      it('should handle state transition from closed to open', () => {
        const breaker = service.createBreaker(mockAction);

        // Simulate circuit opening
        Object.defineProperty(mockCircuitBreaker, 'opened', {
          get: () => true,
        });
        Object.defineProperty(mockCircuitBreaker, 'closed', {
          get: () => false,
        });

        const [[, openHandler]] = (mockCircuitBreaker.on as jest.Mock).mock
          .calls;
        openHandler();

        expect(logger.warn).toHaveBeenCalledWith('Circuit breaker opened');
        expect(breaker.opened).toBe(true);
        expect(breaker.closed).toBe(false);
      });

      it('should handle state transition to half-open', () => {
        const breaker = service.createBreaker(mockAction);

        // Simulate circuit half-opening
        Object.defineProperty(mockCircuitBreaker, 'halfOpen', {
          get: () => true,
        });

        const [, [, halfOpenHandler]] = (mockCircuitBreaker.on as jest.Mock)
          .mock.calls;
        halfOpenHandler();

        expect(logger.warn).toHaveBeenCalledWith('Circuit breaker half-open');
        expect(breaker.halfOpen).toBe(true);
      });

      it('should handle state transition to closed', () => {
        const breaker = service.createBreaker(mockAction);

        // Simulate circuit closing
        Object.defineProperty(mockCircuitBreaker, 'opened', {
          get: () => false,
        });
        Object.defineProperty(mockCircuitBreaker, 'closed', {
          get: () => true,
        });

        const [, , [, closeHandler]] = (mockCircuitBreaker.on as jest.Mock).mock
          .calls;
        closeHandler();

        expect(logger.info).toHaveBeenCalledWith('Circuit breaker closed');
        expect(breaker.opened).toBe(false);
        expect(breaker.closed).toBe(true);
      });
    });
  });
});
