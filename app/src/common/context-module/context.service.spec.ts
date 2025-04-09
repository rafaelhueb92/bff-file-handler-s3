import { Test, TestingModule } from '@nestjs/testing';
import { ContextService } from './context.service';
import { RequestWithId } from '../interfaces/request-with-id.interface';

describe('ContextService', () => {
  let service: ContextService;
  let currentStore: Map<string, any> | null = null;

  // Mock AsyncLocalStorage with proper context handling
  const mockAsyncLocalStorage = {
    run: jest.fn((store, callback) => {
      const previousStore = currentStore;
      currentStore = store;
      try {
        return callback();
      } finally {
        currentStore = previousStore;
      }
    }),
    getStore: jest.fn(() => currentStore),
  };

  jest.mock('async_hooks', () => ({
    AsyncLocalStorage: jest
      .fn()
      .mockImplementation(() => mockAsyncLocalStorage),
  }));

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ContextService],
    }).compile();

    service = module.get<ContextService>(ContextService);
    // Reset the store before each test
    currentStore = null;
  });

  afterEach(() => {
    jest.clearAllMocks();
    currentStore = null;
  });

  describe('run', () => {
    it('should create a new store and run the callback', () => {
      const mockRequest: RequestWithId = {
        id: 'test-id',
        ip: '127.0.0.1',
      };
      const mockCallback = jest.fn();

      service.run(mockRequest, mockCallback);

      expect(mockCallback).toHaveBeenCalled();
    });
  });

  describe('set', () => {
    it('should set value in store when store exists', () => {
      service.run({} as RequestWithId, () => {
        service.set('testKey', 'testValue');
        expect(service.get('testKey')).toBe('testValue');
      });
    });

    it('should not throw when store does not exist', () => {
      expect(() => {
        service.set('testKey', 'testValue');
      }).not.toThrow();
    });

    it('should handle different value types', () => {
      service.run({} as RequestWithId, () => {
        service.set('stringKey', 'string');
        service.set('numberKey', 123);
        service.set('objectKey', { test: 'value' });
        service.set('arrayKey', [1, 2, 3]);
        service.set('booleanKey', true);

        expect(service.get('stringKey')).toBe('string');
        expect(service.get('numberKey')).toBe(123);
        expect(service.get('objectKey')).toEqual({ test: 'value' });
        expect(service.get('arrayKey')).toEqual([1, 2, 3]);
        expect(service.get('booleanKey')).toBe(true);
      });
    });
  });

  describe('get', () => {
    it('should get value from store when store exists', () => {
      service.run({} as RequestWithId, () => {
        service.set('testKey', 'testValue');
        expect(service.get('testKey')).toBe('testValue');
      });
    });

    it('should return undefined when store does not exist', () => {
      const value = service.get('testKey');
      expect(value).toBeUndefined();
    });

    it('should return undefined when key does not exist', () => {
      service.run({} as RequestWithId, () => {
        const value = service.get('nonExistentKey');
        expect(value).toBeUndefined();
      });
    });
  });

  describe('integration', () => {
    it('should maintain context throughout the execution', () => {
      service.run({} as RequestWithId, () => {
        service.set('key1', 'value1');
        service.set('key2', 'value2');

        expect(service.get('key1')).toBe('value1');
        expect(service.get('key2')).toBe('value2');
      });
    });

    it('should isolate context between different runs', () => {
      service.run({} as RequestWithId, () => {
        service.set('key', 'value1');
        expect(service.get('key')).toBe('value1');
      });

      service.run({} as RequestWithId, () => {
        expect(service.get('key')).toBeUndefined();
        service.set('key', 'value2');
        expect(service.get('key')).toBe('value2');
      });
    });
  });
});
