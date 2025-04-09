import { Test, TestingModule } from '@nestjs/testing';
import { HealthController } from './health.controller';
import { HealthService } from './health.service';

describe('HealthController', () => {
  let controller: HealthController;
  let healthService: jest.Mocked<HealthService>;

  beforeEach(async () => {
    // Create mock HealthService
    const mockHealthService = {
      check: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [
        {
          provide: HealthService,
          useValue: mockHealthService,
        },
      ],
    }).compile();

    controller = module.get<HealthController>(HealthController);
    healthService = module.get(HealthService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('check', () => {
    it('should return health check result', async () => {
      const mockHealthCheckResult = {
        healthy: true,
        healthyService: true,
        bucketHealth: true,
        cpuRatio: '0.30',
        memUsage: '40.00%',
        freeSpaceDisk: '953.67 MB',
        uptime: '3600s',
        totalMem: '15258.79 MB',
        freeMem: '7629.39 MB',
      };

      healthService.check.mockResolvedValue(mockHealthCheckResult);

      const result = await controller.check();

      expect(result).toBe(mockHealthCheckResult);
      expect(healthService.check).toHaveBeenCalledTimes(1);
      expect(healthService.check).toHaveBeenCalledWith();
    });

    it('should handle health check failure', async () => {
      const mockError = new Error('Health check failed');
      healthService.check.mockRejectedValue(mockError);

      await expect(controller.check()).rejects.toThrow('Health check failed');
      expect(healthService.check).toHaveBeenCalledTimes(1);
    });

    it('should handle unhealthy status', async () => {
      const mockUnhealthyResult = {
        healthy: false,
        healthyService: false,
        bucketHealth: true,
        cpuRatio: '0.90',
        memUsage: '95.00%',
        freeSpaceDisk: '100.00 MB',
        uptime: '3600s',
        totalMem: '15258.79 MB',
        freeMem: '762.94 MB',
      };

      healthService.check.mockResolvedValue(mockUnhealthyResult);

      const result = await controller.check();

      expect(result).toBe(mockUnhealthyResult);
      expect(result.healthy).toBe(false);
      expect(healthService.check).toHaveBeenCalledTimes(1);
    });

    it('should handle partial health check failure', async () => {
      const mockPartialFailureResult = {
        healthy: false,
        healthyService: true,
        bucketHealth: false,
        cpuRatio: '0.50',
        memUsage: '60.00%',
        freeSpaceDisk: '500.00 MB',
        uptime: '3600s',
        totalMem: '15258.79 MB',
        freeMem: '6103.52 MB',
      };

      healthService.check.mockResolvedValue(mockPartialFailureResult);

      const result = await controller.check();

      expect(result).toBe(mockPartialFailureResult);
      expect(result.healthy).toBe(false);
      expect(result.healthyService).toBe(true);
      expect(result.bucketHealth).toBe(false);
      expect(healthService.check).toHaveBeenCalledTimes(1);
    });

    it('should handle missing metrics in response', async () => {
      const mockBasicResult = {
        healthy: true,
        healthyService: true,
        bucketHealth: true,
      };

      healthService.check.mockResolvedValue(mockBasicResult);

      const result = await controller.check();

      expect(result).toBe(mockBasicResult);
      expect(result.healthy).toBe(true);
      expect(healthService.check).toHaveBeenCalledTimes(1);
    });
  });
});
