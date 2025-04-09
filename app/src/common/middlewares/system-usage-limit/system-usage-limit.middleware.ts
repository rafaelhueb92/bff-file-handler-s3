import { Injectable, NestMiddleware } from '@nestjs/common';
import { HealthService } from '../../../health/health.service';
import { TooManyRequestsException } from '../../exceptions/too-many-requests.exception';

@Injectable()
export class SystemUsageLimitMiddleware implements NestMiddleware {
  constructor(private healthService: HealthService) {}

  async use(req: any, res: any, next: () => void) {
    const isAllowed = await this.healthService.allowRequest();
    if (!isAllowed) {
      throw new TooManyRequestsException('Usage Rate limit reached');
    }
    next();
  }
}
