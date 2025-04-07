import { HttpArgumentsHost } from '@nestjs/common/interfaces';
import { ContextInterceptor } from './context.interceptor';
import { ContextService } from './context.service';
import { ExecutionContext, CallHandler } from '@nestjs/common';
import { of } from 'rxjs';

describe('ContextInterceptor', () => {
  let interceptor: ContextInterceptor;
  let contextService: ContextService;

  beforeEach(() => {
    contextService = {
      run: jest.fn(),
      set: jest.fn(),
    } as any;

    interceptor = new ContextInterceptor(contextService);
  });

  it('should run context, set values, and pass through response', (done) => {
    const mockRequest = { id: 'abc-123' };

    const mockExecutionContext: Partial<ExecutionContext> = {
      switchToHttp: (): HttpArgumentsHost => ({
        getRequest: <T = any>() => mockRequest as T,
        getResponse: <T = any>() => ({}) as T,
        getNext: <T = any>() => ({}) as T,
      }),
      getClass: () => {
        class TestController {}
        return new TestController() as T;
      },
      getHandler: () => function testMethod() {},
    };

    const mockCallHandler: CallHandler = {
      handle: () => of('success'),
    };

    (contextService.run as jest.Mock).mockImplementation((req, callback) => {
      callback();
    });

    const result$ = interceptor.intercept(
      mockExecutionContext as ExecutionContext,
      mockCallHandler,
    );

    result$.subscribe({
      next: (value) => {
        expect(value).toBe('success');
      },
      complete: () => {
        expect(contextService.run).toHaveBeenCalledWith(
          mockRequest,
          expect.any(Function),
        );
        expect(contextService.set).toHaveBeenCalledWith('id', 'abc-123');
        expect(contextService.set).toHaveBeenCalledWith(
          'class',
          'TestController',
        );
        expect(contextService.set).toHaveBeenCalledWith('method', 'testMethod');
        done();
      },
    });
  });
});
