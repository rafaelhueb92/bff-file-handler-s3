import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { HealthService } from '../../../health/health.service';
import { TooManyRequestsException } from '../../exceptions/too-many-requests.exception';

@Injectable()
export class SystemUsageLimitInterceptor implements NestInterceptor {
  constructor(private healthService: HealthService) {}

  async intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Promise<Observable<any>> {
    const isAllowed = await this.healthService.allowRequest();
    if (!isAllowed) {
      throw new TooManyRequestsException('Usage Rate limit reached');
    }
    return next.handle();
  }
}
