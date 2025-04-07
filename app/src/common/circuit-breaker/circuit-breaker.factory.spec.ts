import { CircuitBreakerFactoryService } from './circuit-breaker.factory';
import CircuitBreaker from 'opossum';
import { ConfigService } from '@nestjs/config';
import { LoggerService } from '../logger/logger.service';

jest.mock('opossum');

describe('CircuitBreakerFactoryService', () => {
  let factory: CircuitBreakerFactoryService;
  let configService: jest.Mocked<ConfigService>;
  let logger: jest.Mocked<LoggerService>;

  beforeEach(() => {
    configService = {
      get: jest.fn(),
    } as any;

    logger = {
      warn: jest.fn(),
      info: jest.fn(),
    } as any;

    factory = new CircuitBreakerFactoryService(configService, logger);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should create a CircuitBreaker with config values and register events', () => {
    configService.get.mockImplementation((key: string) => {
      const values = {
        's3.circuitBreaker.timeout': 10000,
        's3.circuitBreaker.errorThreshold': 60,
        's3.circuitBreaker.resetTimeout': 5000,
      };
      return values[key];
    });

    const mockAction = jest.fn().mockResolvedValue('ok');

    const onSpy = jest.fn();
    (CircuitBreaker as unknown as jest.Mock).mockImplementation(() => ({
      on: onSpy,
    }));

    const breaker = factory.createBreaker(mockAction);

    expect(CircuitBreaker).toHaveBeenCalledWith(mockAction, {
      timeout: 10000,
      errorThresholdPercentage: 60,
      resetTimeout: 5000,
    });

    expect(onSpy).toHaveBeenCalledWith('open', expect.any(Function));
    expect(onSpy).toHaveBeenCalledWith('halfOpen', expect.any(Function));
    expect(onSpy).toHaveBeenCalledWith('close', expect.any(Function));
    expect(breaker).toBeDefined();
  });
});
