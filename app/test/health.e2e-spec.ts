import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { HealthModule } from '../src/health/health.module';
import { LoggerService } from '../src/common/logger/logger.service';
import { S3ServiceCB } from '../src/common/aws/s3/s3.service.cb';
import path from 'path';
import * as fs from 'fs';

describe('HealthController (e2e)', () => {
  let app: INestApplication;
  let loggerService: jest.Mocked<LoggerService>;
  let s3Service: jest.Mocked<S3ServiceCB>;

  beforeEach(async () => {
    // Create mock services
    const mockLoggerService = {
      info: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
    };

    const mockS3Service = {
      checkBucketHealth: jest.fn().mockResolvedValue(true),
    };

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [HealthModule],
    })
      .overrideProvider(LoggerService)
      .useValue(mockLoggerService)
      .overrideProvider(S3ServiceCB)
      .useValue(mockS3Service)
      .compile();

    app = moduleFixture.createNestApplication();
    loggerService = moduleFixture.get(LoggerService);
    s3Service = moduleFixture.get(S3ServiceCB);

    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  describe('/health (GET)', () => {
    it('should return healthy status when all systems are operational', async () => {
      const response = await request(app.getHttpServer())
        .get('/health')
        .expect(200);

      expect(response.body).toEqual(
        expect.objectContaining({
          healthy: true,
          healthyService: true,
          bucketHealth: true,
          cpuRatio: expect.any(String),
          memUsage: expect.any(String),
          freeSpaceDisk: expect.any(String),
          uptime: expect.any(String),
          totalMem: expect.any(String),
          freeMem: expect.any(String),
        }),
      );

      expect(loggerService.info).toHaveBeenCalledWith(
        'Health check performed',
        expect.any(Object),
      );
    });

    it('should return unhealthy status when S3 bucket is not healthy', async () => {
      s3Service.checkBucketHealth.mockResolvedValueOnce(false);

      const response = await request(app.getHttpServer())
        .get('/health')
        .expect(200);

      expect(response.body).toEqual(
        expect.objectContaining({
          healthy: false,
          bucketHealth: false,
        }),
      );
    });

    it('should handle service errors gracefully', async () => {
      s3Service.checkBucketHealth.mockRejectedValueOnce(
        new Error('Bucket check failed'),
      );

      await request(app.getHttpServer()).get('/health').expect(500);

      expect(loggerService.error).toHaveBeenCalledWith(
        'Error in health check',
        expect.objectContaining({
          error: 'Bucket check failed',
        }),
      );
    });

    it('should include all required metrics in response', async () => {
      const response = await request(app.getHttpServer())
        .get('/health')
        .expect(200);

      // Verify all required metrics are present
      const requiredMetrics = [
        'cpuRatio',
        'memUsage',
        'freeSpaceDisk',
        'uptime',
        'totalMem',
        'freeMem',
      ];

      for (const metric of requiredMetrics) {
        expect(response.body).toHaveProperty(metric);
      }
    });

    it('should handle high system load scenarios', async () => {
      // Simulate high CPU usage by running intensive task
      const startTime = Date.now();
      while (Date.now() - startTime < 100) {
        Math.random();
      }

      const response = await request(app.getHttpServer())
        .get('/health')
        .expect(200);

      expect(response.body).toEqual(
        expect.objectContaining({
          healthy: expect.any(Boolean),
          cpuRatio: expect.any(String),
          memUsage: expect.any(String),
        }),
      );
    });

    it('should respond within acceptable time limit', async () => {
      const startTime = Date.now();

      await request(app.getHttpServer()).get('/health').expect(200);

      const endTime = Date.now();
      const responseTime = endTime - startTime;

      expect(responseTime).toBeLessThan(1000); // Response should be under 1 second
    });
  });

  describe('Health Check Metrics', () => {
    it('should return valid CPU ratio', async () => {
      const response = await request(app.getHttpServer())
        .get('/health')
        .expect(200);

      const cpuRatio = parseFloat(response.body.cpuRatio);
      expect(cpuRatio).toBeGreaterThanOrEqual(0);
      expect(cpuRatio).toBeLessThanOrEqual(100);
    });

    it('should return valid memory usage percentage', async () => {
      const response = await request(app.getHttpServer())
        .get('/health')
        .expect(200);

      const memUsage = parseFloat(response.body.memUsage);
      expect(memUsage).toBeGreaterThanOrEqual(0);
      expect(memUsage).toBeLessThanOrEqual(100);
      expect(response.body.memUsage).toMatch(/%$/);
    });

    it('should return valid disk space in MB', async () => {
      const response = await request(app.getHttpServer())
        .get('/health')
        .expect(200);

      expect(response.body.freeSpaceDisk).toMatch(/ MB$/);
      const freeSpace = parseFloat(response.body.freeSpaceDisk);
      expect(freeSpace).toBeGreaterThan(0);
    });
  });
});
