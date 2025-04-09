import { Test, TestingModule } from '@nestjs/testing';
import { ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable, of, throwError } from 'rxjs';
import { ContextInterceptor } from './context.interceptor';
import { ContextService } from './context.service';
import { RequestWithId } from '../interfaces/request-with-id.interface';

describe('ContextInterceptor', () => {
  let interceptor: ContextInterceptor;
  let contextService: jest.Mocked<ContextService>;

  // Mock class for testing
  class TestController {
    testMethod() {}
  }

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ContextInterceptor,
        {
          provide: ContextService,
          useValue: {
            run: jest.fn((request, callback) => callback()),
            set: jest.fn(),
            get: jest.fn(),
          },
        },
      ],
    }).compile();

    interceptor = module.get<ContextInterceptor>(ContextInterceptor);
    contextService = module.get(ContextService);
  });

  it('should be defined', () => {
    expect(interceptor).toBeDefined();
  });

  describe('intercept', () => {
    let mockExecutionContext: ExecutionContext;
    let mockCallHandler: CallHandler;
    let mockRequest: RequestWithId;

    beforeEach(() => {
      mockRequest = {
        id: 'test-id',
        ip: '127.0.0.1',
      } as RequestWithId;

      const httpContext = {
        getRequest: jest.fn().mockImplementation(() => mockRequest),
      };

      mockExecutionContext = {
        switchToHttp: jest.fn().mockImplementation(() => httpContext),
        getClass: jest.fn().mockImplementation(() => TestController),
        getHandler: jest
          .fn()
          .mockImplementation(() => TestController.prototype.testMethod),
      } as unknown as ExecutionContext;

      mockCallHandler = {
        handle: jest.fn().mockImplementation(() => of(null)),
      } as CallHandler;
    });

    it('should set context values and handle successful response', (done) => {
      const responseValue = { data: 'test' };
      (mockCallHandler.handle as jest.Mock).mockImplementation(() =>
        of(responseValue),
      );

      interceptor.intercept(mockExecutionContext, mockCallHandler).subscribe({
        next: (value) => {
          expect(value).toEqual(responseValue);
          expect(contextService.run).toHaveBeenCalled();
          expect(contextService.set).toHaveBeenCalledWith('id', 'test-id');
          expect(contextService.set).toHaveBeenCalledWith('ip', '127.0.0.1');
          expect(contextService.set).toHaveBeenCalledWith(
            'class',
            'TestController',
          );
          expect(contextService.set).toHaveBeenCalledWith(
            'method',
            'testMethod',
          );
        },
        complete: () => {
          done();
        },
      });
    });

    it('should handle errors properly', (done) => {
      const testError = new Error('Test error');
      (mockCallHandler.handle as jest.Mock).mockImplementation(() =>
        throwError(() => testError),
      );

      interceptor.intercept(mockExecutionContext, mockCallHandler).subscribe({
        error: (error) => {
          expect(error).toBe(testError);
          expect(contextService.run).toHaveBeenCalled();
          expect(contextService.set).toHaveBeenCalledWith('id', 'test-id');
          expect(contextService.set).toHaveBeenCalledWith('ip', '127.0.0.1');
          expect(contextService.set).toHaveBeenCalledWith(
            'class',
            'TestController',
          );
          expect(contextService.set).toHaveBeenCalledWith(
            'method',
            'testMethod',
          );
          done();
        },
      });
    });

    it('should complete the observable when the handler completes', (done) => {
      (mockCallHandler.handle as jest.Mock).mockImplementation(() => of(null));

      interceptor.intercept(mockExecutionContext, mockCallHandler).subscribe({
        complete: () => {
          expect(contextService.run).toHaveBeenCalled();
          expect(contextService.set).toHaveBeenCalledWith('id', 'test-id');
          expect(contextService.set).toHaveBeenCalledWith('ip', '127.0.0.1');
          expect(contextService.set).toHaveBeenCalledWith(
            'class',
            'TestController',
          );
          expect(contextService.set).toHaveBeenCalledWith(
            'method',
            'testMethod',
          );
          done();
        },
      });
    });

    it('should handle missing request id gracefully', (done) => {
      const requestWithoutId = { ip: '127.0.0.1' } as RequestWithId;
      const httpContext = {
        getRequest: jest.fn().mockImplementation(() => requestWithoutId),
      };

      mockExecutionContext = {
        switchToHttp: jest.fn().mockImplementation(() => httpContext),
        getClass: jest.fn().mockImplementation(() => TestController),
        getHandler: jest
          .fn()
          .mockImplementation(() => TestController.prototype.testMethod),
      } as unknown as ExecutionContext;

      (mockCallHandler.handle as jest.Mock).mockImplementation(() => of(null));

      interceptor.intercept(mockExecutionContext, mockCallHandler).subscribe({
        complete: () => {
          expect(contextService.set).toHaveBeenCalledWith('id', undefined);
          expect(contextService.set).toHaveBeenCalledWith('ip', '127.0.0.1');
          done();
        },
      });
    });

    it('should handle missing request ip gracefully', (done) => {
      const requestWithoutIp = { id: 'test-id' } as RequestWithId;
      const httpContext = {
        getRequest: jest.fn().mockImplementation(() => requestWithoutIp),
      };

      mockExecutionContext = {
        switchToHttp: jest.fn().mockImplementation(() => httpContext),
        getClass: jest.fn().mockImplementation(() => TestController),
        getHandler: jest
          .fn()
          .mockImplementation(() => TestController.prototype.testMethod),
      } as unknown as ExecutionContext;

      (mockCallHandler.handle as jest.Mock).mockImplementation(() => of(null));

      interceptor.intercept(mockExecutionContext, mockCallHandler).subscribe({
        complete: () => {
          expect(contextService.set).toHaveBeenCalledWith('id', 'test-id');
          expect(contextService.set).toHaveBeenCalledWith('ip', undefined);
          done();
        },
      });
    });

    it('should preserve the execution order of context operations', (done) => {
      const setOperations: string[] = [];
      (contextService.set as jest.Mock).mockImplementation((key: string) => {
        setOperations.push(key);
      });

      (mockCallHandler.handle as jest.Mock).mockImplementation(() => of(null));

      interceptor.intercept(mockExecutionContext, mockCallHandler).subscribe({
        complete: () => {
          expect(setOperations).toEqual(['id', 'ip', 'class', 'method']);
          done();
        },
      });
    });

    it('should call contextService.run with the request', (done) => {
      (mockCallHandler.handle as jest.Mock).mockImplementation(() => of(null));

      interceptor.intercept(mockExecutionContext, mockCallHandler).subscribe({
        complete: () => {
          expect(contextService.run).toHaveBeenCalledWith(
            mockRequest,
            expect.any(Function),
          );
          done();
        },
      });
    });
  });
});
