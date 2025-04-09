import { Test, TestingModule } from '@nestjs/testing';
import { SpaceReservedMiddleware } from './space-reserved.middleware';
import { LoggerService } from '../../logger/logger.service';
import { HealthService } from '../../../health/health.service';
import { RequestWithId } from '../../interfaces/request-with-id.interface';
import { InsufficientStorageException } from '../../exceptions/insufficient-storage.exception';

describe('SpaceReservedMiddleware', () => {
  let middleware: SpaceReservedMiddleware;
  let logger: jest.Mocked<LoggerService>;
  let healthService: jest.Mocked<HealthService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SpaceReservedMiddleware,
        {
          provide: LoggerService,
          useValue: {
            info: jest.fn(),
            error: jest.fn(),
            warn: jest.fn(),
          },
        },
        {
          provide: HealthService,
          useValue: {
            getFreeSpaceDisk: jest.fn(),
          },
        },
      ],
    }).compile();

    middleware = module.get<SpaceReservedMiddleware>(SpaceReservedMiddleware);
    logger = module.get(LoggerService);
    healthService = module.get(HealthService);

    // Spy on console.log to prevent output during tests
    jest.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  const createMockRequest = (fileSize?: number): RequestWithId => ({
    id: 'test-id',
    file: fileSize
      ? {
          fieldname: 'file',
          originalname: 'test.txt',
          encoding: '7bit',
          mimetype: 'text/plain',
          size: fileSize,
          destination: '/tmp',
          filename: 'test.txt',
          path: '/tmp/test.txt',
          buffer: Buffer.from('test'),
          stream: null as any,
        }
      : undefined,
  });

  describe('use', () => {
    it('should pass through when no file is present', async () => {
      const request = createMockRequest();
      const next = jest.fn();

      await middleware.use(request, {}, next);

      expect(next).toHaveBeenCalled();
      expect(healthService.getFreeSpaceDisk).not.toHaveBeenCalled();
    });

    it('should allow upload when enough space is available', async () => {
      const fileSize = 100 * 1024 * 1024; // 100MB
      const freeDiskSpace = 1000 * 1024 * 1024; // 1GB
      const request = createMockRequest(fileSize);
      const next = jest.fn();

      healthService.getFreeSpaceDisk.mockResolvedValue(freeDiskSpace);

      await middleware.use(request, {}, next);

      expect(next).toHaveBeenCalled();
      expect(logger.info).toHaveBeenCalledWith('Uploading file size (bytes):', {
        id: 'test-id',
        fileSize,
      });
    });

    it('should handle getFreeSpaceDisk failure', async () => {
      const fileSize = 100 * 1024 * 1024; // 100MB
      const request = createMockRequest(fileSize);
      const next = jest.fn();
      const error = new Error('Failed to get disk space');

      healthService.getFreeSpaceDisk.mockRejectedValue(error);

      await expect(middleware.use(request, {}, next)).rejects.toThrow(error);

      expect(next).not.toHaveBeenCalled();
    });
  });
});
