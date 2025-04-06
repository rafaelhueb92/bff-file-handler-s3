import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Observable, throwError } from 'rxjs';

@Injectable()
export class RateLimitInterceptor implements NestInterceptor {
  private readonly requestsMap = new Map<string, number>();

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const ip = request.ip || request.connection.remoteAddress;
    const now = Date.now();
    const lastRequest = this.requestsMap.get(ip);

    if (lastRequest && now - lastRequest < 10_000) {
      console.error('Too Many Requests. Wait 10 seconds.');
      return throwError(
        () =>
          new HttpException(
            'Too Many Requests. Wait 10 seconds.',
            HttpStatus.TOO_MANY_REQUESTS,
          ),
      );
    }

    this.requestsMap.set(ip, now);
    return next.handle();
  }
}
