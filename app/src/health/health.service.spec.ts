// health.service.spec.ts
import { HealthService } from './health.service';
import * as os from 'os';
import { statfs } from 'fs/promises';
import { RequestContextService } from '../common/request-context-module/request-context.service';

jest.mock('os');
jest.mock('fs/promises', () => ({
  statfs: jest.fn(),
}));

describe('HealthService', () => {
  let healthService: HealthService;
  let mockRequestContext: RequestContextService;

  beforeEach(() => {
    mockRequestContext = {} as any;
    healthService = new HealthService(mockRequestContext);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should calculate memory usage', async () => {
    jest.spyOn(os, 'totalmem').mockReturnValue(100);
    jest.spyOn(os, 'freemem').mockReturnValue(20);

    const result = await healthService.getMemUsage();
    expect(result).toBeCloseTo(0.8);
  });

  it('should calculate CPU ratio', async () => {
    jest.spyOn(os, 'cpus').mockReturnValue(new Array(4).fill({}));
    jest.spyOn(os, 'loadavg').mockReturnValue([2]);

    const result = await healthService.getCpuRatio();
    expect(result).toBeCloseTo(0.5);
  });

  it('should get free space disk', async () => {
    (statfs as jest.Mock).mockResolvedValue({ bavail: 1000, bsize: 512 });
    const result = await healthService.getFreeSpaceDisk();
    expect(result).toBe(512000);
  });

  it('should allow request based on usage (with mocked CPU and memory)', async () => {
    const result = await healthService.allowRequest(0.2, 0.3);
    expect(result).toBe(true);
  });

  it('should return health check result with metrics', async () => {
    jest.spyOn(os, 'cpus').mockReturnValue(new Array(4).fill({}));
    jest.spyOn(os, 'loadavg').mockReturnValue([2]);
    jest.spyOn(os, 'totalmem').mockReturnValue(100);
    jest.spyOn(os, 'freemem').mockReturnValue(20);
    jest.spyOn(os, 'uptime').mockReturnValue(1000);
    (statfs as jest.Mock).mockResolvedValue({ bavail: 1000, bsize: 512 });

    const result = await healthService.check(true);
    expect(result).toMatchObject({
      healthy: expect.any(Boolean),
      cpuRatio: expect.any(String),
      memUsage: expect.stringMatching(/^\d+(\.\d+)?%$/),
      freeSpaceDisk: expect.stringMatching(/MB$/),
      uptime: '1000s',
      totalMem: expect.stringMatching(/MB$/),
      freeMem: expect.stringMatching(/MB$/),
    });
  });

  it('should return health check result without metrics', async () => {
    jest.spyOn(os, 'cpus').mockReturnValue(new Array(4).fill({}));
    jest.spyOn(os, 'loadavg').mockReturnValue([2]);
    jest.spyOn(os, 'totalmem').mockReturnValue(100);
    jest.spyOn(os, 'freemem').mockReturnValue(20);

    const result = await healthService.check(false);
    expect(result).toHaveProperty('healthy');
    expect(result).not.toHaveProperty('freeSpaceDisk');
  });
});
