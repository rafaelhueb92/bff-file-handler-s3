import { HttpArgumentsHost } from '@nestjs/common/interfaces';
import { RequestInterceptor } from './request.interceptor';
import { ExecutionContext, CallHandler } from '@nestjs/common';
import { of } from 'rxjs';
import { v4 as uuidv4 } from 'uuid';

jest.mock('uuid', () => ({
  v4: jest.fn(() => 'mocked-uuid'),
}));

describe('RequestInterceptor', () => {
  let interceptor: RequestInterceptor;

  beforeEach(() => {
    interceptor = new RequestInterceptor();
  });

  it('should assign a UUID to the request and log timings', (done) => {
    const mockRequest: any = {
      method: 'GET',
      url: '/test',
    };

    const mockExecutionContext: Partial<ExecutionContext> = {
      switchToHttp: (): HttpArgumentsHost => ({
        getRequest: () => mockRequest,
        getResponse: jest.fn(),
        getNext: jest.fn(),
      }),
    };

    const mockCallHandler: CallHandler = {
      handle: () => of('test-response'),
    };

    const logSpy = jest.spyOn(console, 'log').mockImplementation();

    interceptor
      .intercept(mockExecutionContext as ExecutionContext, mockCallHandler)
      .subscribe({
        next: (value) => {
          expect(value).toBe('test-response');
        },
        complete: () => {
          expect(mockRequest.id).toBe('mocked-uuid');
          expect(logSpy).toHaveBeenCalledWith(
            `Initializing request with id mocked-uuid`,
          );
          expect(logSpy).toHaveBeenCalledWith(
            expect.stringMatching(
              /Request mocked-uuid for GET \/test completed in \d+ms/,
            ),
          );
          logSpy.mockRestore();
          done();
        },
      });
  });
});
