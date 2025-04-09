import { Test, TestingModule } from '@nestjs/testing';
import { ExecutionContext, CallHandler } from '@nestjs/common';
import { of, throwError } from 'rxjs';
import { RequestInterceptor } from './request.interceptor';
import { RequestWithId } from '../../interfaces/request-with-id.interface';
import * as uuid from 'uuid';

jest.mock('uuid', () => ({
  v4: jest.fn(),
}));

describe('RequestInterceptor', () => {
  let interceptor: RequestInterceptor;
  let mockDate: number;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [RequestInterceptor],
    }).compile();

    interceptor = module.get<RequestInterceptor>(RequestInterceptor);

    // Mock console.log
    jest.spyOn(console, 'log').mockImplementation(() => {});

    // Mock Date.now
    mockDate = 1000000;
    jest.spyOn(Date, 'now').mockImplementation(() => mockDate);

    // Mock UUID
    (uuid.v4 as jest.Mock).mockReturnValue('test-uuid');
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  const createMockExecutionContext = (
    method: string,
    url: string,
  ): ExecutionContext => {
    const request: Partial<RequestWithId> = {
      method,
      url,
    };

    return {
      switchToHttp: () => ({
        getRequest: () => request,
      }),
    } as ExecutionContext;
  };

  const createMockCallHandler = (
    response?: any,
    error?: Error,
  ): CallHandler => ({
    handle: () => (error ? throwError(() => error) : of(response)),
  });

  it('should be defined', () => {
    expect(interceptor).toBeDefined();
  });

  it('should assign UUID to request and log initialization', (done) => {
    const mockContext = createMockExecutionContext('GET', '/test');
    const mockCallHandler = createMockCallHandler({ data: 'test' });

    interceptor.intercept(mockContext, mockCallHandler).subscribe({
      next: () => {
        const request = mockContext.switchToHttp().getRequest();
        expect(request.id).toBe('test-uuid');
        expect(console.log).toHaveBeenCalledWith(
          'Initializing request with id test-uuid',
        );
      },
      complete: done,
    });
  });

  it('should log request completion with timing', (done) => {
    const mockContext = createMockExecutionContext('GET', '/test');
    const mockCallHandler = createMockCallHandler({ data: 'test' });

    // Simulate time passing
    let callCount = 0;
    (Date.now as jest.Mock).mockImplementation(() => {
      callCount++;
      return mockDate + (callCount > 1 ? 100 : 0); // Add 100ms on second call
    });

    interceptor.intercept(mockContext, mockCallHandler).subscribe({
      complete: () => {
        expect(console.log).toHaveBeenCalledWith(
          'Request test-uuid for GET /test completed in 100ms',
        );
        done();
      },
    });
  });

  it('should handle errors properly', (done) => {
    const mockContext = createMockExecutionContext('POST', '/test');
    const testError = new Error('Test error');
    const mockCallHandler = createMockCallHandler(null, testError);

    interceptor.intercept(mockContext, mockCallHandler).subscribe({
      error: (error) => {
        expect(error).toBe(testError);
        expect(console.log).toHaveBeenCalledWith(
          'Initializing request with id test-uuid',
        );
        done();
      },
    });
  });

  it('should pass through response data', (done) => {
    const mockContext = createMockExecutionContext('GET', '/test');
    const responseData = { data: 'test' };
    const mockCallHandler = createMockCallHandler(responseData);

    interceptor.intercept(mockContext, mockCallHandler).subscribe({
      next: (value) => {
        expect(value).toEqual(responseData);
      },
      complete: done,
    });
  });

  it('should handle different HTTP methods', (done) => {
    const methods = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'];
    let completedRequests = 0;

    methods.forEach((method) => {
      const mockContext = createMockExecutionContext(method, '/test');
      const mockCallHandler = createMockCallHandler({ data: 'test' });

      interceptor.intercept(mockContext, mockCallHandler).subscribe({
        complete: () => {
          completedRequests++;
          if (completedRequests === methods.length) {
            methods.forEach((m) => {
              expect(console.log).toHaveBeenCalledWith(
                expect.stringContaining(m),
              );
            });
            done();
          }
        },
      });
    });
  });

  it('should handle different URLs', (done) => {
    const mockContext = createMockExecutionContext(
      'GET',
      '/complex/path?query=test',
    );
    const mockCallHandler = createMockCallHandler({ data: 'test' });

    interceptor.intercept(mockContext, mockCallHandler).subscribe({
      complete: () => {
        expect(console.log).toHaveBeenCalledWith(
          expect.stringContaining('/complex/path?query=test'),
        );
        done();
      },
    });
  });

  it('should generate unique IDs for different requests', (done) => {
    const uuids = ['uuid-1', 'uuid-2'];
    let uuidIndex = 0;
    (uuid.v4 as jest.Mock).mockImplementation(() => uuids[uuidIndex++]);

    const mockContext1 = createMockExecutionContext('GET', '/test1');
    const mockContext2 = createMockExecutionContext('GET', '/test2');
    const mockCallHandler = createMockCallHandler({ data: 'test' });

    let completedRequests = 0;

    interceptor.intercept(mockContext1, mockCallHandler).subscribe({
      complete: () => {
        completedRequests++;
        checkCompletion();
      },
    });

    interceptor.intercept(mockContext2, mockCallHandler).subscribe({
      complete: () => {
        completedRequests++;
        checkCompletion();
      },
    });

    function checkCompletion() {
      if (completedRequests === 2) {
        expect(mockContext1.switchToHttp().getRequest().id).toBe('uuid-1');
        expect(mockContext2.switchToHttp().getRequest().id).toBe('uuid-2');
        done();
      }
    }
  });
});
