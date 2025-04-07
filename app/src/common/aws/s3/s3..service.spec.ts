import { Test, TestingModule } from '@nestjs/testing';
import { S3UploadService } from './s3.service';
import { ConfigService } from '@nestjs/config';
import { LoggerService } from '../../common/logger/logger.service';
import { S3 } from 'aws-sdk';
import * as fs from 'fs';
import * as path from 'path';
import { ServiceUnavailableException } from '@nestjs/common';

jest.mock('aws-sdk', () => {
  const mUpload = jest.fn().mockReturnThis();
  return {
    S3: jest.fn(() => ({
      upload: mUpload,
      headBucket: jest.fn(),
    })),
  };
});

jest.mock('fs', () => ({
  createReadStream: jest.fn(() => 'mockStream'),
  unlink: jest.fn((_, cb) => cb?.()),
}));

describe('S3Service', () => {
  let service: S3Service;
  let s3Mock: jest.Mocked<S3>;
  const mockFile = {
    path: '/tmp/test.csv',
    originalname: 'test.csv',
    mimetype: 'text/csv',
  } as Express.Multer.File;

  const mockConfigService = {
    get: jest.fn((key: string) => {
      const config = {
        's3.region': 'us-east-1',
        's3.primaryBucket': 'main-bucket',
        's3.fallbackBucket': 'fallback-bucket',
        's3.retry.attempts': 1,
        's3.retry.fallbackAttempts': 1,
        's3.circuitBreaker.timeout': 1000,
        's3.circuitBreaker.errorThreshold': 50,
        's3.circuitBreaker.resetTimeout': 500,
      };
      return config[key];
    }),
  };

  const mockLogger = {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        S3Service,
        { provide: ConfigService, useValue: mockConfigService },
        { provide: LoggerService, useValue: mockLogger },
      ],
    }).compile();

    service = module.get<S3Service>(S3Service);
    s3Mock = (S3 as unknown as jest.Mock).mock.results[0].value;
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('uploadFile', () => {
    it('should upload file to primary bucket', async () => {
      const uploadPromiseMock = jest
        .fn()
        .mockResolvedValue({ Location: 'url' });
      s3Mock.upload.mockReturnValueOnce({ promise: uploadPromiseMock } as any);

      const result = await service.uploadFile(mockFile);
      expect(result).toEqual({ Location: 'url' });
      expect(fs.createReadStream).toHaveBeenCalledWith(mockFile.path);
      expect(s3Mock.upload).toHaveBeenCalled();
    });

    it('should throw if both buckets fail', async () => {
      s3Mock.upload.mockReturnValue({
        promise: jest.fn().mockRejectedValue(new Error('upload error')),
      } as any);

      await expect(service.uploadFile(mockFile)).rejects.toThrow();
      expect(mockLogger.error).toHaveBeenCalled();
    });
  });
});
