import { Test, TestingModule } from '@nestjs/testing';
import { S3Service } from './s3.service';
import { LoggerService } from '../../logger/logger.service';
import { S3 as S3_SDK } from 'aws-sdk';
import { S3Client as S3_Health, HeadBucketCommand } from '@aws-sdk/client-s3';
import { RetryService } from '../../retry/retry.service';
import { ServiceUnavailableException } from '@nestjs/common';
import * as fs from 'fs';
import { EventEmitter } from 'events';

class MockStream extends EventEmitter {
  constructor(private mockData: Buffer | string) {
    super();
  }

  pipe() {
    return this;
  }

  destroy(error?: Error) {
    if (error) {
      this.emit('error', error);
    }
    return this;
  }

  end() {
    this.emit('end');
    return this;
  }
}

jest.mock('fs', () => ({
  createReadStream: jest.fn().mockImplementation(() => {
    const stream = new MockStream(Buffer.from('mock file content'));
    setTimeout(() => {
      stream.emit('data', Buffer.from('mock file content'));
      stream.emit('end');
    }, 0);
    return stream;
  }),
  statSync: jest.fn().mockReturnValue({ size: 1024 * 1024 * 10 }),
  unlink: jest.fn().mockImplementation((path, callback) => {
    if (callback) callback(null);
    return Promise.resolve();
  }),
}));

jest.mock('aws-sdk', () => ({
  S3: jest.fn().mockImplementation(() => ({
    upload: jest.fn().mockReturnThis(),
    createMultipartUpload: jest.fn().mockReturnThis(),
    uploadPart: jest.fn().mockReturnThis(),
    completeMultipartUpload: jest.fn().mockReturnThis(),
    abortMultipartUpload: jest.fn().mockReturnThis(),
    promise: jest.fn(),
  })),
}));

jest.mock('@aws-sdk/client-s3', () => ({
  S3Client: jest.fn().mockImplementation(() => ({
    send: jest.fn(),
  })),
  HeadBucketCommand: jest.fn(),
}));

describe('S3Service', () => {
  let service: S3Service;
  let logger: jest.Mocked<LoggerService>;
  let s3SDK: jest.Mocked<S3_SDK>;
  let s3Health: jest.Mocked<S3_Health>;
  let retryService: jest.Mocked<RetryService>;

  const mockFile: Express.Multer.File = {
    fieldname: 'file',
    originalname: 'test.txt',
    encoding: '7bit',
    mimetype: 'text/plain',
    size: 1024 * 1024 * 10,
    destination: '/tmp',
    filename: 'test.txt',
    path: '/tmp/test.txt',
    buffer: Buffer.from('test'),
    stream: null as any,
  };

  const mockS3Params: S3_SDK.PutObjectRequest = {
    Bucket: 'test-bucket',
    Key: 'test-key',
    ContentType: 'text/plain',
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        S3Service,
        {
          provide: LoggerService,
          useValue: {
            info: jest.fn(),
            warn: jest.fn(),
            error: jest.fn(),
          },
        },
        {
          provide: S3_SDK,
          useValue: {
            upload: jest.fn().mockReturnThis(),
            createMultipartUpload: jest.fn().mockReturnThis(),
            uploadPart: jest.fn().mockReturnThis(),
            completeMultipartUpload: jest.fn().mockReturnThis(),
            abortMultipartUpload: jest.fn().mockReturnThis(),
            promise: jest.fn(),
          },
        },
        {
          provide: S3_Health,
          useValue: {
            send: jest.fn(),
          },
        },
        {
          provide: RetryService,
          useValue: {
            execute: jest.fn((fn) => fn()),
          },
        },
      ],
    }).compile();

    service = module.get<S3Service>(S3Service);
    logger = module.get(LoggerService) as jest.Mocked<LoggerService>;
    s3SDK = module.get(S3_SDK) as jest.Mocked<S3_SDK>;
    s3Health = module.get(S3_Health) as jest.Mocked<S3_Health>;
    retryService = module.get(RetryService) as jest.Mocked<RetryService>;
  });

  describe('uploadS3', () => {
    const mockUploadResult = {
      Location: 'https://test-bucket.s3.amazonaws.com/test-key',
      ETag: '"mock-etag"',
      Bucket: 'test-bucket',
      Key: 'test-key',
    };

    beforeEach(() => {
      (s3SDK.upload as jest.Mock).mockReturnValue({
        promise: jest.fn().mockResolvedValue(mockUploadResult),
      });
    });

    it('should upload file successfully', async () => {
      const result = await service.uploadS3(mockS3Params, mockFile);

      expect(result).toEqual(mockUploadResult);
      expect(s3SDK.upload).toHaveBeenCalledWith(
        expect.objectContaining({
          Bucket: mockS3Params.Bucket,
          Key: mockS3Params.Key,
        }),
      );
      expect(logger.info).toHaveBeenCalledWith(
        expect.stringContaining('Upload to bucket'),
      );
    });

    it('should handle upload errors', async () => {
      const error = new Error('Upload failed');
      (s3SDK.upload as jest.Mock).mockReturnValue({
        promise: jest.fn().mockRejectedValue(error),
      });

      await expect(service.uploadS3(mockS3Params, mockFile)).rejects.toThrow(
        error,
      );
      expect(logger.warn).toHaveBeenCalledWith(
        expect.stringContaining('Upload attempt failed'),
      );
    });
  });

  describe('multipartUploadS3', () => {
    const mockMultipartInitResult = {
      UploadId: 'mock-upload-id',
    };

    const mockPartUploadResult = {
      ETag: '"mock-part-etag"',
    };

    const mockCompleteResult = {
      Location: 'https://test-bucket.s3.amazonaws.com/test-key',
      Bucket: 'test-bucket',
      Key: 'test-key',
    };

    beforeEach(() => {
      (s3SDK.createMultipartUpload as jest.Mock).mockReturnValue({
        promise: jest.fn().mockResolvedValue(mockMultipartInitResult),
      });
      (s3SDK.uploadPart as jest.Mock).mockReturnValue({
        promise: jest.fn().mockResolvedValue(mockPartUploadResult),
      });
      (s3SDK.completeMultipartUpload as jest.Mock).mockReturnValue({
        promise: jest.fn().mockResolvedValue(mockCompleteResult),
      });
    });

    it('should handle multipart upload successfully', async () => {
      const result = await service.multipartUploadS3(mockS3Params, mockFile);

      expect(result).toEqual(mockCompleteResult);
      expect(s3SDK.createMultipartUpload).toHaveBeenCalled();
      expect(s3SDK.uploadPart).toHaveBeenCalled();
      expect(s3SDK.completeMultipartUpload).toHaveBeenCalled();
    });

    it('should abort multipart upload on failure', async () => {
      const error = new Error('Upload failed');
      (s3SDK.uploadPart as jest.Mock).mockReturnValue({
        promise: jest.fn().mockRejectedValue(error),
      });

      await expect(
        service.multipartUploadS3(mockS3Params, mockFile),
      ).rejects.toThrow(error);

      expect(s3SDK.abortMultipartUpload).toHaveBeenCalledWith({
        Bucket: mockS3Params.Bucket,
        Key: mockS3Params.Key,
        UploadId: mockMultipartInitResult.UploadId,
      });
    });
  });

  describe('checkSingleBucketWithParams', () => {
    it('should return true when bucket is healthy', async () => {
      (s3Health.send as jest.Mock).mockResolvedValue({});

      const result = await service.checkSingleBucketWithParams('test-bucket');

      expect(result).toBe(true);
      expect(logger.info).toHaveBeenCalledWith(
        expect.stringContaining('Bucket "test-bucket" is Healthy'),
      );
    });

    it('should throw ServiceUnavailableException when bucket check fails', async () => {
      const error = new Error('Bucket check failed');
      (s3Health.send as jest.Mock).mockRejectedValue(error);

      await expect(
        service.checkSingleBucketWithParams('test-bucket'),
      ).rejects.toThrow(ServiceUnavailableException);
      expect(logger.error).toHaveBeenCalledWith(
        expect.stringContaining('Health Check Failed'),
      );
    });
  });

  describe('readFilePart', () => {
    it('should read file part successfully', async () => {
      const mockStream = new MockStream(Buffer.from('mock file content'));
      (fs.createReadStream as jest.Mock).mockReturnValue(mockStream);

      const resultPromise = service['readFilePart']('/test/path', 0, 1024);

      process.nextTick(() => {
        mockStream.emit('data', Buffer.from('mock file content'));
        mockStream.emit('end');
      });

      const result = await resultPromise;
      expect(result).toBeInstanceOf(Buffer);
    });

    it('should handle read errors', async () => {
      const mockStream = new MockStream(Buffer.from(''));
      (fs.createReadStream as jest.Mock).mockReturnValue(mockStream);

      const resultPromise = service['readFilePart']('/test/path', 0, 1024);

      process.nextTick(() => {
        mockStream.emit('error', new Error('Read failed'));
      });

      await expect(resultPromise).rejects.toThrow('Read failed');
    });
  });

  describe('uploadPartWithTimeout', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should upload part successfully', async () => {
      const mockResult = { ETag: '"mock-etag"' };

      (s3SDK.uploadPart as jest.Mock).mockReturnValue({
        promise: jest.fn().mockResolvedValueOnce(mockResult),
      });

      const uploadPromise = service['uploadPartWithTimeout']({
        Bucket: 'test-bucket',
        Key: 'test-key',
        uploadId: 'test-upload-id',
        partNumber: 1,
        partBuffer: Buffer.from('test'),
      });

      await Promise.resolve();
      jest.runAllTimers();

      const result = await uploadPromise;
      expect(result).toEqual(mockResult);
    });

    it('should handle timeout', async () => {
      (s3SDK.uploadPart as jest.Mock).mockReturnValue({
        promise: jest.fn(
          () =>
            new Promise((resolve) => {
              setTimeout(resolve, 400000);
            }),
        ),
      });

      const uploadPromise = service['uploadPartWithTimeout']({
        Bucket: 'test-bucket',
        Key: 'test-key',
        uploadId: 'test-upload-id',
        partNumber: 1,
        partBuffer: Buffer.from('test'),
      });

      jest.advanceTimersByTime(300001);

      await expect(uploadPromise).rejects.toThrow('Upload timeout for part 1');
    });
  });
});
