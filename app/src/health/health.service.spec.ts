import { Test, TestingModule } from '@nestjs/testing';
import { HealthService } from './health.service';
import { LoggerService } from '../common/logger/logger.service';
import { S3ServiceCB } from '../common/aws/s3/s3.service.cb';
import * as os from 'os';
import * as fs from 'fs/promises';

jest.mock('os');
jest.mock('fs/promises');

describe('HealthService', () => {
  let service: HealthService;
  let logger: jest.Mocked<LoggerService>;
  let s3Service: jest.Mocked<S3ServiceCB>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        HealthService,
        {
          provide: LoggerService,
          useValue: {
            info: jest.fn(),
            error: jest.fn(),
            warn: jest.fn(),
          },
        },
        {
          provide: S3ServiceCB,
          useValue: {
            checkBucketHealth: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<HealthService>(HealthService);
    logger = module.get(LoggerService);
    s3Service = module.get(S3ServiceCB);

    // Reset mocks
    jest.clearAllMocks();

    // Mock Date.now
    jest.spyOn(Date, 'now').mockReturnValue(1000);
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.spyOn(Date, 'now').mockRestore();
  });

  describe('getFreeSpaceDisk', () => {
    it('should calculate free disk space correctly', async () => {
      const mockStatfs = {
        bavail: 1000000,
        bsize: 4096,
      };
      (fs.statfs as jest.Mock).mockResolvedValue(mockStatfs);

      const result = await service.getFreeSpaceDisk();
      expect(result).toBe(mockStatfs.bavail * mockStatfs.bsize);
    });

    it('should handle statfs errors', async () => {
      const error = new Error('Statfs failed');
      (fs.statfs as jest.Mock).mockRejectedValue(error);

      await expect(service.getFreeSpaceDisk()).rejects.toThrow(error);
    });
  });

  describe('getCpuRatio', () => {
    it('should calculate CPU ratio correctly', async () => {
      (os.cpus as jest.Mock).mockReturnValue(Array(4).fill({}));
      (os.loadavg as jest.Mock).mockReturnValue([2, 1.5, 1]);

      const result = await service.getCpuRatio();
      expect(result).toBe(0.5); // 2 / 4 = 0.5
    });
  });

  describe('getMemUsage', () => {
    it('should calculate memory usage correctly', async () => {
      (os.totalmem as jest.Mock).mockReturnValue(16000000000);
      (os.freemem as jest.Mock).mockReturnValue(8000000000);

      const result = await service.getMemUsage();
      expect(result).toBe(0.5); // (16GB - 8GB) / 16GB = 0.5
      expect(logger.info).toHaveBeenCalledWith('Memory usage calculated', {
        context: 'HealthService',
        result: { usage: 0.5 },
      });
    });

    it('should handle memory calculation errors', async () => {
      (os.totalmem as jest.Mock).mockImplementation(() => {
        throw new Error('Memory error');
      });

      await expect(service.getMemUsage()).rejects.toThrow('Memory error');
      expect(logger.error).toHaveBeenCalledWith(
        'Error calculating memory usage',
        {
          context: 'HealthService',
          error: 'Memory error',
        },
      );
    });
  });

  describe('allowRequest', () => {
    it('should handle errors', async () => {
      jest
        .spyOn(service, 'getCpuRatio')
        .mockRejectedValue(new Error('CPU error'));

      await expect(service.allowRequest()).rejects.toThrow('CPU error');
      expect(logger.error).toHaveBeenCalled();
    });
  });

  describe('check', () => {
    beforeEach(() => {
      jest.spyOn(service, 'getCpuRatio').mockResolvedValue(0.3);
      jest.spyOn(service, 'getMemUsage').mockResolvedValue(0.4);
      jest.spyOn(service, 'getFreeSpaceDisk').mockResolvedValue(1000000000);
      jest.spyOn(service, 'allowRequest').mockResolvedValue(true);
      s3Service.checkBucketHealth.mockResolvedValue(true);

      (os.uptime as jest.Mock).mockReturnValue(3600);
      (os.totalmem as jest.Mock).mockReturnValue(16000000000);
      (os.freemem as jest.Mock).mockReturnValue(8000000000);
    });

    it('should return full health check with metrics', async () => {
      const result = await service.check(true);

      expect(result).toEqual({
        healthy: true,
        healthyService: true,
        bucketHealth: true,
        cpuRatio: '0.30',
        memUsage: '40.00%',
        freeSpaceDisk: '953.67 MB',
        uptime: '3600s',
        totalMem: '15258.79 MB',
        freeMem: '7629.39 MB',
      });

      expect(logger.info).toHaveBeenCalledWith('Health check performed', {
        context: 'HealthService',
        result: expect.any(Object),
      });
    });

    it('should return basic health check without metrics', async () => {
      const result = await service.check(false);

      expect(result).toEqual({
        healthy: true,
        healthyService: true,
        bucketHealth: true,
      });
    });

    it('should handle unhealthy service', async () => {
      jest.spyOn(service, 'allowRequest').mockResolvedValue(false);

      const result = await service.check();
      expect(result.healthy).toBe(false);
      expect(result.healthyService).toBe(false);
    });

    it('should handle unhealthy bucket', async () => {
      s3Service.checkBucketHealth.mockResolvedValue(false);

      const result = await service.check();
      expect(result.healthy).toBe(false);
      expect(result.bucketHealth).toBe(false);
    });

    it('should handle errors', async () => {
      const error = new Error('Health check failed');
      jest.spyOn(service, 'getCpuRatio').mockRejectedValue(error);

      await expect(service.check()).rejects.toThrow(error);
      expect(logger.error).toHaveBeenCalledWith('Error in health check', {
        context: 'HealthService',
        error: 'Health check failed',
      });
    });
  });
});
