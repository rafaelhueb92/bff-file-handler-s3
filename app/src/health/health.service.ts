import { Injectable } from '@nestjs/common';
import * as os from 'os';
import { statfs } from 'fs/promises';
import { RequestContextService } from '../common/request-context-module/request-context.service';

@Injectable()
export class HealthService {
  private lastCheck = Date.now();
  private tokens = 10;

  constructor(private readonly requestContext: RequestContextService) {}

  private memoryInMB(mem: number): string {
    return `${(mem / 1024 / 1024).toFixed(2)} MB`;
  }

  private toPercentage(value: number): string {
    return `${(value * 100).toFixed(2)}%`;
  }

  async getFreeSpaceDisk(): Promise<number> {
    try {
      const { bavail, bsize } = await statfs('/');
      const space = bavail * bsize;
      return space;
    } catch (error) {
      throw error;
    }
  }

  async getCpuRatio(): Promise<number> {
    try {
      const cpuCount = os.cpus().length;
      const loadAvg = os.loadavg()[0];
      const ratio = loadAvg / cpuCount;

      return Promise.resolve(ratio);
    } catch (error) {
      throw error;
    }
  }

  async getMemUsage(): Promise<number> {
    try {
      const totalMem = os.totalmem();
      const freeMem = os.freemem();
      const usage = (totalMem - freeMem) / totalMem;

      console.info('Memory usage calculated', {
        context: 'HealthService',
        result: { usage },
      });

      return Promise.resolve(usage);
    } catch (error) {
      console.error('Error calculating memory usage', {
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

      console.info('Token bucket updated', {
        result: {
          allowed,
          tokens: this.tokens,
          loadFactor,
        },
      });

      return allowed;
    } catch (error) {
      console.error('Error checking allowRequest', {
        error: (error as Error).message,
      });
      throw error;
    }
  }

  async check(showMetrics: boolean = true): Promise<any> {
    try {
      const [cpuRatio, memUsage, freeSpaceDisk] = await Promise.all([
        this.getCpuRatio(),
        this.getMemUsage(),
        showMetrics ? this.getFreeSpaceDisk() : Promise.resolve(0),
      ]);

      const healthy = await this.allowRequest(cpuRatio, memUsage);

      const result = {
        healthy,
        ...(showMetrics && {
          cpuRatio: cpuRatio.toFixed(2),
          memUsage: this.toPercentage(memUsage),
          freeSpaceDisk: this.memoryInMB(freeSpaceDisk),
          uptime: `${os.uptime()}s`,
          totalMem: this.memoryInMB(os.totalmem()),
          freeMem: this.memoryInMB(os.freemem()),
        }),
      };

      console.info('Health check performed', {
        context: 'HealthService',
        result,
      });

      return result;
    } catch (error) {
      console.error('Error in health check', {
        context: 'HealthService',
        error: (error as Error).message,
      });
      throw error;
    }
  }
}
