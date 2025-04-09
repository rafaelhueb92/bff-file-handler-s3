import { Test, TestingModule } from '@nestjs/testing';
import { LoggerService } from './logger.service';
import { ContextService } from '../context-module/context.service';

// Mock pino module
jest.mock('pino', () => {
  const mockPino = {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  };

  return {
    __esModule: true,
    default: jest.fn(() => mockPino),
  };
});

describe('LoggerService', () => {
  let service: LoggerService;
  let contextService: jest.Mocked<ContextService>;
  let mockLogger: any;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LoggerService,
        {
          provide: ContextService,
          useValue: {
            get: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<LoggerService>(LoggerService);
    contextService = module.get(ContextService);
    mockLogger = (service as any).logger;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getLogContext', () => {
    it('should return default values when context is empty', () => {
      contextService.get.mockReturnValue(undefined);

      const context = (service as any).getLogContext();

      expect(context).toEqual({
        requestId: 'no-id',
        class: 'unknown-class',
        method: 'unknown-method',
        ip: 'unknown-ip',
      });
    });

    it('should return context values when available', () => {
      const mockContextValues = {
        id: 'test-id',
        class: 'TestClass',
        method: 'testMethod',
        ip: '127.0.0.1',
      };

      contextService.get.mockImplementation(
        (key: string) =>
          mockContextValues[key as keyof typeof mockContextValues],
      );

      const context = (service as any).getLogContext();

      expect(context).toEqual({
        requestId: 'test-id',
        class: 'TestClass',
        method: 'testMethod',
        ip: '127.0.0.1',
      });
    });
  });

  describe('logging methods', () => {
    const testCases = [
      { method: 'info', level: 'info' },
      { method: 'error', level: 'error' },
      { method: 'warn', level: 'warn' },
      { method: 'debug', level: 'debug' },
    ] as const;

    testCases.forEach(({ method, level }) => {
      describe(`${method}`, () => {
        it(`should call logger.${level} with correct parameters`, () => {
          const message = 'Test message';
          const additionalContext = { additional: 'context' };
          const mockContextValues = {
            id: 'test-id',
            class: 'TestClass',
            method: 'testMethod',
            ip: '127.0.0.1',
          };

          contextService.get.mockImplementation(
            (key: string) =>
              mockContextValues[key as keyof typeof mockContextValues],
          );

          service[method](message, additionalContext);

          expect(mockLogger[level]).toHaveBeenCalledWith(
            expect.objectContaining({
              requestId: 'test-id',
              class: 'TestClass',
              method: 'testMethod',
              ip: '127.0.0.1',
              ...additionalContext,
            }),
            message,
          );
        });

        it(`should call logger.${level} with default empty context`, () => {
          const message = 'Test message';
          contextService.get.mockReturnValue(undefined);

          service[method](message);

          expect(mockLogger[level]).toHaveBeenCalledWith(
            expect.objectContaining({
              requestId: 'no-id',
              class: 'unknown-class',
              method: 'unknown-method',
              ip: 'unknown-ip',
            }),
            message,
          );
        });
      });
    });
  });

  describe('error handling', () => {
    it('should handle undefined message gracefully', () => {
      expect(() => service.info(undefined as any)).not.toThrow();
    });

    it('should handle null context gracefully', () => {
      expect(() => service.info('Test message', null as any)).not.toThrow();
    });
  });

  describe('complex context handling', () => {
    it('should handle nested context objects', () => {
      const message = 'Test message';
      const context = {
        nested: {
          value: 'test',
          deep: {
            value: 'deeper',
          },
        },
      };

      service.info(message, context);

      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.objectContaining({
          nested: {
            value: 'test',
            deep: {
              value: 'deeper',
            },
          },
        }),
        message,
      );
    });

    it('should handle array values in context', () => {
      const message = 'Test message';
      const context = {
        array: [1, 2, 3],
        nested: {
          array: ['a', 'b', 'c'],
        },
      };

      service.info(message, context);

      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.objectContaining({
          array: [1, 2, 3],
          nested: {
            array: ['a', 'b', 'c'],
          },
        }),
        message,
      );
    });

    it('should merge multiple context objects correctly', () => {
      const message = 'Test message';
      const contextValues = {
        id: 'test-id',
        class: 'TestClass',
        method: 'testMethod',
        ip: '127.0.0.1',
      };
      const additionalContext = {
        customField: 'value',
        nested: { data: 'test' },
      };

      contextService.get.mockImplementation(
        (key: string) => contextValues[key as keyof typeof contextValues],
      );

      service.info(message, additionalContext);

      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.objectContaining({
          requestId: 'test-id',
          class: 'TestClass',
          method: 'testMethod',
          ip: '127.0.0.1',
          ...additionalContext,
        }),
        message,
      );
    });
  });
});
