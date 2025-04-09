import { Test, TestingModule } from '@nestjs/testing';
import { S3ServiceCB } from './s3.service.cb';
import { ConfigService } from '@nestjs/config';
import { LoggerService } from '../../logger/logger.service';
import { CircuitBreakerFactoryService } from '../../circuit-breaker/circuit-breaker.factory';
import { S3Service } from './s3.service';
import { ServiceUnavailableException } from '@nestjs/common';
import { S3 } from 'aws-sdk';

describe('S3ServiceCB', () => {
  let service: S3ServiceCB;
  let s3Service: S3Service;
  let logger: LoggerService;
  let configService: ConfigService;
  let mockBreaker: {
    fire: jest.Mock;
    fallback: jest.Mock;
  };

  const mockFile: Express.Multer.File = {
    path: '/tmp/test-file',
    size: 1024 * 1024, // 1MB
    mimetype: 'text/plain',
    filename: 'test.txt',
    originalname: 'test.txt',
    fieldname: 'file',
    encoding: '7bit',
    destination: '/tmp',
    buffer: Buffer.from('test'),
    stream: null as any,
  };

  const mockS3Response: S3.ManagedUpload.SendData = {
    Location: 'https://mock-bucket.s3.amazonaws.com/test-key',
    ETag: '"mock-etag"',
    Bucket: 'mock-bucket',
    Key: 'test-key',
  };

  beforeEach(async () => {
    mockBreaker = {
      fire: jest.fn(),
      fallback: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        S3ServiceCB,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn().mockImplementation((key: string) => {
              const config = {
                's3.primaryBucket': 'primary-bucket',
                's3.fallbackBucket': 'fallback-bucket',
              };
              return config[key];
            }),
          },
        },
        {
          provide: LoggerService,
          useValue: {
            info: jest.fn(),
            warn: jest.fn(),
            error: jest.fn(),
          },
        },
        {
          provide: CircuitBreakerFactoryService,
          useValue: {
            createBreaker: jest.fn().mockReturnValue(mockBreaker),
          },
        },
        {
          provide: S3Service,
          useValue: {
            uploadS3: jest.fn(),
            multipartUploadS3: jest.fn(),
            checkSingleBucketWithParams: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<S3ServiceCB>(S3ServiceCB);
    s3Service = module.get<S3Service>(S3Service);
    logger = module.get<LoggerService>(LoggerService);
    configService = module.get<ConfigService>(ConfigService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('initialization', () => {
    it('should be defined', () => {
      expect(service).toBeDefined();
    });

    it('should throw error when bucket config is missing', () => {
      jest.spyOn(configService, 'get').mockReturnValue(undefined);

      expect(() => {
        new S3ServiceCB(configService, logger, {} as any, s3Service);
      }).toThrow('S3 bucket configuration is missing');
    });
  });

  describe('uploadFile', () => {
    beforeEach(() => {
      service['initializeCircuitBreakers']();
    });

    it('should upload small files successfully', async () => {
      mockBreaker.fire.mockResolvedValueOnce(mockS3Response);

      const result = await service.uploadFile(mockFile, 'test-key');

      expect(result).toEqual({
        success: true,
        message: 'File uploaded successfully',
        key: 'test-key',
        data: mockS3Response,
      });
      expect(mockBreaker.fire).toHaveBeenCalledWith(
        mockFile,
        'test-key',
        'primary-bucket',
      );
    });

    it('should use multipart upload for large files', async () => {
      const largeFile = { ...mockFile, size: 51 * 1024 * 1024 }; // 51MB
      mockBreaker.fire.mockResolvedValueOnce(mockS3Response);

      const result = await service.uploadFile(largeFile, 'test-key');

      expect(result).toEqual({
        success: true,
        message: 'Large file uploaded successfully via multipart upload',
        key: 'test-key',
        data: mockS3Response,
      });
      expect(mockBreaker.fire).toHaveBeenCalledWith(
        largeFile,
        'test-key',
        'primary-bucket',
      );
    });
  });

  describe('circuit breaker behavior', () => {
    beforeEach(() => {
      service['initializeCircuitBreakers']();
    });

    it('should handle both primary and fallback failures', async () => {
      const primaryError = new Error('Primary failed');
      const fallbackError = new Error('Fallback failed');

      mockBreaker.fire
        .mockRejectedValueOnce(primaryError)
        .mockRejectedValueOnce(fallbackError);

      mockBreaker.fallback.mockImplementation((fallbackFn) => {
        mockBreaker.fire.mockImplementationOnce(() =>
          Promise.reject(fallbackError),
        );
      });

      await expect(service.uploadFile(mockFile, 'test-key')).rejects.toThrow(
        ServiceUnavailableException,
      );

      expect(mockBreaker.fire).toHaveBeenCalledWith(
        mockFile,
        'test-key',
        'primary-bucket',
      );
      expect(mockBreaker.fallback).toHaveBeenCalled();
      expect(logger.error).toHaveBeenCalledWith(
        'Upload failed on all attempts:',
        expect.any(Error),
      );
    });
  });

  describe('health check', () => {
    beforeEach(() => {
      service['initializeCircuitBreakers']();
    });

    it('should return true when primary bucket is healthy', async () => {
      mockBreaker.fire.mockResolvedValueOnce(true);

      const result = await service.checkBucketHealth();

      expect(result).toBe(true);
      expect(mockBreaker.fire).toHaveBeenCalledWith('primary-bucket');
    });

    it('should return false when both buckets fail health check', async () => {
      mockBreaker.fire.mockRejectedValueOnce(new Error('Primary failed'));
      mockBreaker.fallback.mockImplementation((fallbackFn) => {
        mockBreaker.fire.mockImplementationOnce(() =>
          Promise.reject(new Error('Fallback failed')),
        );
      });

      const result = await service.checkBucketHealth();

      expect(result).toBe(false);
      expect(mockBreaker.fire).toHaveBeenCalledWith('primary-bucket');
      expect(mockBreaker.fallback).toHaveBeenCalled();
      expect(logger.error).toHaveBeenCalledWith(
        'Health check failed on all attempts:',
        expect.any(Error),
      );
    });
  });

  describe('error handling', () => {
    beforeEach(() => {
      service['initializeCircuitBreakers']();
    });

    it('should include proper error context in ServiceUnavailableException', async () => {
      const error = new Error('Test error');
      mockBreaker.fire.mockRejectedValue(error);

      try {
        await service.uploadFile(mockFile, 'test-key');
        fail('Should have thrown an error');
      } catch (e) {
        expect(e).toBeInstanceOf(ServiceUnavailableException);
        expect(e.cause).toBe(error);
        expect(e.message).toBe(
          'Upload service temporarily unavailable. Please try again later.',
        );
      }
    });

    it('should log errors with appropriate context', async () => {
      const error = new Error('Test error');
      mockBreaker.fire.mockRejectedValue(error);

      try {
        await service.uploadFile(mockFile, 'test-key');
      } catch (e) {
        expect(logger.error).toHaveBeenCalledWith(
          'Upload failed on all attempts:',
          error,
        );
      }
    });
  });

  describe('multipart upload threshold', () => {
    beforeEach(() => {
      service['initializeCircuitBreakers']();
    });

    it('should use regular upload for files under threshold', async () => {
      const smallFile = { ...mockFile, size: 49 * 1024 * 1024 }; // 49MB
      mockBreaker.fire.mockResolvedValueOnce(mockS3Response);

      await service.uploadFile(smallFile, 'test-key');

      expect(mockBreaker.fire).toHaveBeenCalledWith(
        smallFile,
        'test-key',
        'primary-bucket',
      );
    });

    it('should use multipart upload for files over threshold', async () => {
      const largeFile = { ...mockFile, size: 51 * 1024 * 1024 }; // 51MB
      mockBreaker.fire.mockResolvedValueOnce(mockS3Response);

      await service.uploadFile(largeFile, 'test-key');

      expect(mockBreaker.fire).toHaveBeenCalledWith(
        largeFile,
        'test-key',
        'primary-bucket',
      );
    });
  });
});
