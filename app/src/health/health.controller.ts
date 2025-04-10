import { Controller, Get } from '@nestjs/common';
import { HealthService } from './health.service';
import { Public } from '../common/decorator/public/public.decorator';

@Controller('health')
export class HealthController {
  constructor(private readonly healService: HealthService) {}

  @Get()
  async check() {
    return await this.healService.check();
  }

  @Public()
  @Get('check')
  health_check() {
    return true;
  }
}
