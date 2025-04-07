import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Observable, throwError } from 'rxjs';
import { LoggerService } from '../../logger/logger.service';
import { ContextService } from '../../context-module/context.service';
import { RequestWithId } from '../../interfaces/request-with-id.interface';

@Injectable()
export class RateLimitInterceptor implements NestInterceptor {
  private readonly requestsMap = new Map<string, number>();
  constructor(
    private readonly logger: LoggerService,
    private readonly contextService: ContextService,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const ip = request.ip || request.connection.remoteAddress;
    const now = Date.now();
    const lastRequest = this.requestsMap.get(ip);
    this.contextService.set('ip', request.ip);

    this.logger.info(`${ip} is trying to request.`);

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
