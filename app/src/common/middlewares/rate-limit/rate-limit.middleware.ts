import { Injectable, NestMiddleware } from '@nestjs/common';
import { ContextService } from '../../context-module/context.service';
import { LoggerService } from '../../logger/logger.service';
import { TooManyRequestsException } from '../../exceptions/too-many-requests.exception';
import { Request, Response } from 'express';

@Injectable()
export class RateLimitMiddleware implements NestMiddleware {
  private readonly requestsMap = new Map<string, number>();
  constructor(
    private readonly logger: LoggerService,
    private readonly contextService: ContextService,
  ) {}
  use(req: Request, _: Response, next: () => void) {
    const ip = req.ip || '';
    const now = Date.now();
    const lastRequest = this.requestsMap.get(ip);
    this.contextService.set('ip', ip);

    this.logger.info(`${ip} is trying to request.`);

    if (lastRequest && now - lastRequest < 10_000) {
      console.error('Too Many Requests. Wait 10 seconds.');

      throw new TooManyRequestsException('Too Many Requests. Wait 10 seconds.');
    }

    this.requestsMap.set(ip, now);

    next();
  }
}
