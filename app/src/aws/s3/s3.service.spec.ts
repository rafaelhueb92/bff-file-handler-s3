import { S3Service } from './s3.service';
import { S3 } from 'aws-sdk';
import * as fs from 'fs';
import { ServiceUnavailableException } from '@nestjs/common';

jest.mock('aws-sdk', () => {
  const mUpload = jest.fn().mockReturnThis();
  const mPromise = jest.fn();
  const S3 = jest.fn(() => ({
    upload: mUpload,
    promise: mPromise,
  }));
  return { S3 };
});

jest.mock('fs', () => ({
  createReadStream: jest.fn(() => 'mockStream'),
  unlink: jest.fn((path, cb) => cb()),
}));

describe('S3Service', () => {
  let service: S3Service;
  let s3UploadMock: jest.Mock;
  let s3PromiseMock: jest.Mock;

  beforeEach(() => {
    const mockConfigService = {
      get: jest.fn((key) => {
        if (key === 'AWS_S3_BUCKET') return 'main-bucket';
        if (key === 'AWS_S3_BUCKET_BACKUP') return 'backup-bucket';
      }),
    };

    service = new S3Service(mockConfigService as any);
    s3UploadMock = (S3 as any).mock.instances[0].upload;
    s3PromiseMock = (S3 as any).mock.instances[0].promise;
  });

  it('should upload file to primary bucket successfully', async () => {
    s3PromiseMock.mockResolvedValueOnce({ Location: 'main-location' });

    const mockFile: any = {
      path: '/tmp/test.csv',
      originalname: 'test.csv',
      mimetype: 'text/csv',
    };

    const result = await service.uploadFile(mockFile);

    expect(result).toEqual({ Location: 'main-location' });
    expect(fs.createReadStream).toHaveBeenCalledWith(mockFile.path);
  });

  it('should fallback to backup bucket if main bucket fails', async () => {
    s3PromiseMock
      .mockRejectedValueOnce(new Error('Main bucket failed'))
      .mockResolvedValueOnce({ Location: 'backup-location' });

    const mockFile: any = {
      path: '/tmp/test.csv',
      originalname: 'test.csv',
      mimetype: 'text/csv',
    };

    const result = await service.uploadFile(mockFile);

    expect(result).toEqual({ Location: 'backup-location' });
    expect(s3UploadMock).toHaveBeenCalledTimes(2);
  });

  it('should throw if both buckets fail', async () => {
    s3PromiseMock
      .mockRejectedValueOnce(new Error('Main failed'))
      .mockRejectedValueOnce(new Error('Backup failed'));

    const mockFile: any = {
      path: '/tmp/test.csv',
      originalname: 'test.csv',
      mimetype: 'text/csv',
    };

    await expect(service.uploadFile(mockFile)).rejects.toThrow(
      ServiceUnavailableException,
    );
  });
});
