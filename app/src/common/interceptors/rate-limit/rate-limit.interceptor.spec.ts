import { RateLimitInterceptor } from './rate-limit.interceptor';
import {
  CallHandler,
  ExecutionContext,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { of } from 'rxjs';

describe('RateLimitInterceptor', () => {
  let interceptor: RateLimitInterceptor;
  let mockContext: ExecutionContext;
  let mockHandler: CallHandler;

  beforeEach(() => {
    interceptor = new RateLimitInterceptor();

    mockHandler = {
      handle: jest.fn(() => of('success')),
    } as any;

    mockContext = {
      switchToHttp: () => ({
        getRequest: () => ({
          ip: '127.0.0.1',
        }),
      }),
    } as any;
  });

  it('should allow the first request', (done) => {
    interceptor.intercept(mockContext, mockHandler).subscribe((result) => {
      expect(result).toBe('success');
      done();
    });
  });

  it('should block the second request if it happens within 10 seconds', (done) => {
    interceptor.intercept(mockContext, mockHandler).subscribe(() => {
      interceptor.intercept(mockContext, mockHandler).subscribe({
        error: (err) => {
          expect(err).toBeInstanceOf(HttpException);
          expect(err.getStatus()).toBe(HttpStatus.TOO_MANY_REQUESTS);
          done();
        },
      });
    });
  });

  it('should allow the request after 10 seconds', (done) => {
    interceptor.intercept(mockContext, mockHandler).subscribe(() => {
      jest.spyOn(Date, 'now').mockImplementationOnce(() => Date.now() + 11000);

      interceptor.intercept(mockContext, mockHandler).subscribe((result) => {
        expect(result).toBe('success');
        done();
      });
    });
  });
});
