import { Injectable } from '@nestjs/common';
import pino from 'pino';
import { ContextService } from '../context-module/context.service';

@Injectable()
export class LoggerService {
  private readonly logger = pino({
    transport: {
      target: 'pino-pretty',
      options: {
        colorize: true,
        translateTime: 'SYS:standard',
        ignore: 'pid,hostname',
      },
    },
  });

  constructor(private readonly contextService: ContextService) {}

  private getLogContext() {
    const requestId = this.contextService.get('id') ?? 'no-id';
    const className = this.contextService.get('class') ?? 'unknown-class';
    const methodName = this.contextService.get('method') ?? 'unknown-method';
    const ip = this.contextService.get('ip') ?? 'unknown-ip';

    return { requestId, class: className, method: methodName, ip };
  }

  private log(
    level: 'info' | 'error' | 'warn' | 'debug',
    message: string,
    context: Record<string, any> = {},
  ) {
    const logContext = this.getLogContext();
    this.logger[level](Object.assign(logContext, context), message);
  }

  info(message: string, context: Record<string, any> = {}) {
    this.log('info', message, context);
  }

  error(message: string, context: Record<string, any> = {}) {
    this.log('error', message, context);
  }

  warn(message: string, context: Record<string, any> = {}) {
    this.log('warn', message, context);
  }

  debug(message: string, context: Record<string, any> = {}) {
    this.log('debug', message, context);
  }
}
