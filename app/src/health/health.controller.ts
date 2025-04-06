import { Controller, Get } from '@nestjs/common';
import { HealthService } from './health.service';

@Controller('health')
export class HealthController {
  constructor(private readonly healService: HealthService) {}

  @Get()
  async check() {
    return await this.healService.check();
  }
}
