// test/context.interceptor.spec.ts

import { ContextInterceptor } from './context.interceptor';
import { RequestContextService } from './request-context.service';
import { CallHandler, ExecutionContext } from '@nestjs/common';
import { of } from 'rxjs';

describe('ContextInterceptor', () => {
  let interceptor: ContextInterceptor;
  let contextService: RequestContextService;

  beforeEach(() => {
    contextService = new RequestContextService();
    interceptor = new ContextInterceptor(contextService);
  });

  it('should set context and call next.handle()', (done) => {
    const mockRequest: any = {
      method: 'GET',
      url: '/test',
    };

    const mockContext: Partial<ExecutionContext> = {
      switchToHttp: () => ({
        getRequest: () => mockRequest,
      }),
      getClass: () => ({ name: 'TestController' }),
      getHandler: () => ({ name: 'testMethod' }),
    };

    const mockCallHandler: CallHandler = {
      handle: () => of('response'),
    };

    const result$ = interceptor.intercept(
      mockContext as ExecutionContext,
      mockCallHandler,
    );

    result$.subscribe({
      next: (value) => {
        expect(value).toBe('response');
        const contextId = contextService.get<string>('id');
        const className = contextService.get<string>('class');
        const methodName = contextService.get<string>('method');

        expect(contextId).toBeDefined();
        expect(className).toBe('TestController');
        expect(methodName).toBe('testMethod');

        done();
      },
    });
  });
});
