import { Injectable } from '@nestjs/common';
import * as os from 'os';
import { statfs } from 'fs/promises';
import { LoggerService } from '../common/logger/logger.service';
import { S3ServiceCB } from '../common/aws/s3/s3.service.cb';

@Injectable()
export class HealthService {
  private lastCheck = Date.now();
  private tokens = 10;

  constructor(
    private readonly s3Service: S3ServiceCB,
    private readonly loggerService: LoggerService,
  ) {}

  private memoryInMB(mem: number): string {
    return `${(mem / 1024 / 1024).toFixed(2)} MB`;
  }

  private toPercentage(value: number): string {
    return `${(value * 100).toFixed(2)}%`;
  }

  async getFreeSpaceDisk(): Promise<number> {
    const { bavail, bsize } = await statfs('/');
    const space = bavail * bsize;
    return Promise.resolve(space);
  }

  async getCpuRatio(): Promise<number> {
    const cpuCount = os.cpus().length;
    const loadAvg = os.loadavg()[0];
    const ratio = loadAvg / cpuCount;

    return Promise.resolve(ratio);
  }

  async getMemUsage(): Promise<number> {
    try {
      const totalMem = os.totalmem();
      const freeMem = os.freemem();
      const usage = (totalMem - freeMem) / totalMem;

      this.loggerService.info('Memory usage calculated', {
        context: 'HealthService',
        result: { usage },
      });

      return Promise.resolve(usage);
    } catch (error) {
      this.loggerService.error('Error calculating memory usage', {
        context: 'HealthService',
        error: (error as Error).message,
      });
      throw error;
    }
  }

  async allowRequest(cpu: number = NaN, mem: number = NaN): Promise<boolean> {
    try {
      if (isNaN(cpu) && isNaN(mem)) {
        [cpu, mem] = await Promise.all([
          this.getCpuRatio(),
          this.getMemUsage(),
        ]);
      } else if (isNaN(cpu)) cpu = await this.getCpuRatio();
      else if (isNaN(mem)) mem = await this.getMemUsage();

      const now = Date.now();
      const elapsed = (now - this.lastCheck) / 1000;
      this.lastCheck = now;

      const loadFactor = Math.max(cpu, mem);
      const regenRate = (1 - loadFactor) * 5;

      this.tokens = Math.min(10, this.tokens + regenRate * elapsed);
      const allowed = this.tokens >= 1;

      if (allowed) {
        this.tokens -= 1;
      }

      this.loggerService.info('Token bucket updated', {
        result: {
          allowed,
          tokens: this.tokens,
          loadFactor,
        },
      });

      return allowed;
    } catch (error) {
      this.loggerService.error('Error checking allowRequest', {
        error: (error as Error).message,
      });
      throw error;
    }
  }

  async check(showMetrics: boolean = true): Promise<HealthCheckResult> {
    try {
      const [cpuRatio, memUsage, freeSpaceDisk] = await Promise.all([
        this.getCpuRatio(),
        this.getMemUsage(),
        showMetrics ? this.getFreeSpaceDisk() : Promise.resolve(0),
      ]);

      const [healthyService, bucketHealth] = await Promise.all([
        this.allowRequest(cpuRatio, memUsage),
        this.s3Service.checkBucketHealth(),
      ]);

      const result = {
        ...{
          healthy: healthyService && bucketHealth,
          healthyService,
          bucketHealth,
        },
        ...(showMetrics && {
          cpuRatio: cpuRatio.toFixed(2),
          memUsage: this.toPercentage(memUsage),
          freeSpaceDisk: this.memoryInMB(freeSpaceDisk),
          uptime: `${os.uptime()}s`,
          totalMem: this.memoryInMB(os.totalmem()),
          freeMem: this.memoryInMB(os.freemem()),
        }),
      };

      this.loggerService.info('Health check performed', {
        context: 'HealthService',
        result,
      });

      return result;
    } catch (error) {
      this.loggerService.error('Error in health check', {
        context: 'HealthService',
        error: (error as Error).message,
      });
      throw error;
    }
  }
}
