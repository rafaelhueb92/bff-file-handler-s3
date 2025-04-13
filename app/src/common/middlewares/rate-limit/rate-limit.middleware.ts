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

  private getClientIp(req: Request): string {
    // Get IP from X-Forwarded-For header (ALB adds this)
    const xForwardedFor = req.header('x-forwarded-for');

    if (xForwardedFor) {
      // Get the first IP in the list (client IP)
      const ips = xForwardedFor.split(',').map((ip) => ip.trim());
      return ips[0];
    }

    // Fallback to other methods
    return (
      req.header('x-real-ip') ||
      req.connection.remoteAddress ||
      req.socket.remoteAddress ||
      req.ip ||
      'unknown'
    );
  }

  use(req: Request, _: Response, next: () => void) {
    const clientIp = this.getClientIp(req);
    const now = Date.now();

    const lastRequest = this.requestsMap.get(clientIp);
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
