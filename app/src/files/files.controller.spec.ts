import { Test, TestingModule } from '@nestjs/testing';
import { FilesController } from './files.controller';
import { S3ServiceCB } from '../common/aws/s3/s3.service.cb';

describe('FilesController', () => {
  let controller: FilesController;
  let s3Service: jest.Mocked<S3ServiceCB>;

  beforeEach(async () => {
    const mockS3Service = {
      uploadFile: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [FilesController],
      providers: [
        {
          provide: S3ServiceCB,
          useValue: mockS3Service,
        },
      ],
    }).compile();

    controller = module.get<FilesController>(FilesController);
    s3Service = module.get(S3ServiceCB);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('uploadFile', () => {
    it('should upload file successfully', async () => {
      // Mock Date.now()
      const mockTimestamp = 1704067200000; // 2024-01-01T00:00:00.000Z
      jest.spyOn(Date, 'now').mockReturnValue(mockTimestamp);

      const mockFile: Express.Multer.File = {
        fieldname: 'file',
        originalname: 'test-file.txt',
        encoding: '7bit',
        mimetype: 'text/plain',
        size: 1024,
        destination: '/tmp',
        filename: 'test-file.txt',
        path: '/tmp/test-file.txt',
        buffer: Buffer.from('test content'),
        stream: null as any,
      };

      const mockS3Response = {
        success: true,
        message: 'File uploaded successfully',
        key: '1704067200000-test-file.txt',
        data: {
          ETag: '"mock-etag"',
          Location: 'https://bucket.s3.amazonaws.com/test-file.txt',
          Key: '1704067200000-test-file.txt',
          Bucket: 'test-bucket',
        },
      };

      s3Service.uploadFile.mockResolvedValue(mockS3Response);

      const result = await controller.uploadFile(mockFile);

      expect(s3Service.uploadFile).toHaveBeenCalledWith(
        mockFile,
        '1704067200000-test-file.txt',
      );
      expect(result).toBe(mockS3Response);

      jest.spyOn(Date, 'now').mockRestore();
    });

    it('should handle files with spaces in name', async () => {
      const mockTimestamp = 1704067200000;
      jest.spyOn(Date, 'now').mockReturnValue(mockTimestamp);

      const mockFile: Express.Multer.File = {
        fieldname: 'file',
        originalname: 'test file with spaces.txt',
        encoding: '7bit',
        mimetype: 'text/plain',
        size: 1024,
        destination: '/tmp',
        filename: 'test-file-with-spaces.txt',
        path: '/tmp/test-file-with-spaces.txt',
        buffer: Buffer.from('test content'),
        stream: null as any,
      };

      const mockS3Response = {
        success: true,
        message: 'File uploaded successfully',
        key: '1704067200000-test file with spaces.txt',
        data: {
          ETag: '"mock-etag"',
          Location: 'https://bucket.s3.amazonaws.com/test-file-with-spaces.txt',
          Key: '1704067200000-test file with spaces.txt',
          Bucket: 'test-bucket',
        },
      };

      s3Service.uploadFile.mockResolvedValue(mockS3Response);

      const result = await controller.uploadFile(mockFile);

      expect(s3Service.uploadFile).toHaveBeenCalledWith(
        mockFile,
        '1704067200000-test file with spaces.txt',
      );
      expect(result).toBe(mockS3Response);

      jest.spyOn(Date, 'now').mockRestore();
    });

    it('should handle files with special characters in name', async () => {
      const mockTimestamp = 1704067200000;
      jest.spyOn(Date, 'now').mockReturnValue(mockTimestamp);

      const mockFile: Express.Multer.File = {
        fieldname: 'file',
        originalname: 'test@file#123.txt',
        encoding: '7bit',
        mimetype: 'text/plain',
        size: 1024,
        destination: '/tmp',
        filename: 'test-file-123.txt',
        path: '/tmp/test-file-123.txt',
        buffer: Buffer.from('test content'),
        stream: null as any,
      };

      const mockS3Response = {
        success: true,
        message: 'File uploaded successfully',
        key: '1704067200000-test@file#123.txt',
        data: {
          ETag: '"mock-etag"',
          Location: 'https://bucket.s3.amazonaws.com/test-file-123.txt',
          Key: '1704067200000-test@file#123.txt',
          Bucket: 'test-bucket',
        },
      };

      s3Service.uploadFile.mockResolvedValue(mockS3Response);

      const result = await controller.uploadFile(mockFile);

      expect(s3Service.uploadFile).toHaveBeenCalledWith(
        mockFile,
        '1704067200000-test@file#123.txt',
      );
      expect(result).toBe(mockS3Response);

      jest.spyOn(Date, 'now').mockRestore();
    });

    it('should handle S3 upload failure', async () => {
      const mockTimestamp = 1704067200000;
      jest.spyOn(Date, 'now').mockReturnValue(mockTimestamp);

      const mockFile: Express.Multer.File = {
        fieldname: 'file',
        originalname: 'test-file.txt',
        encoding: '7bit',
        mimetype: 'text/plain',
        size: 1024,
        destination: '/tmp',
        filename: 'test-file.txt',
        path: '/tmp/test-file.txt',
        buffer: Buffer.from('test content'),
        stream: null as any,
      };

      const mockS3Error = {
        success: false,
        message: 'Upload failed',
        key: '1704067200000-test-file.txt',
        data: new Error('S3 upload failed'),
      };

      s3Service.uploadFile.mockRejectedValue(mockS3Error);

      await expect(controller.uploadFile(mockFile)).rejects.toEqual(
        mockS3Error,
      );

      expect(s3Service.uploadFile).toHaveBeenCalledWith(
        mockFile,
        '1704067200000-test-file.txt',
      );

      jest.spyOn(Date, 'now').mockRestore();
    });

    it('should generate unique keys for files with same name', async () => {
      jest
        .spyOn(Date, 'now')
        .mockReturnValueOnce(1704067200000) // First call
        .mockReturnValueOnce(1704067201000); // Second call

      const mockFile: Express.Multer.File = {
        fieldname: 'file',
        originalname: 'test-file.txt',
        encoding: '7bit',
        mimetype: 'text/plain',
        size: 1024,
        destination: '/tmp',
        filename: 'test-file.txt',
        path: '/tmp/test-file.txt',
        buffer: Buffer.from('test content'),
        stream: null as any,
      };

      const mockS3Response1 = {
        success: true,
        message: 'File uploaded successfully',
        key: '1704067200000-test-file.txt',
        data: {
          ETag: '"mock-etag-1"',
          Location: 'https://bucket.s3.amazonaws.com/test-file-1.txt',
          Key: '1704067200000-test-file.txt',
          Bucket: 'test-bucket',
        },
      };

      const mockS3Response2 = {
        success: true,
        message: 'File uploaded successfully',
        key: '1704067201000-test-file.txt',
        data: {
          ETag: '"mock-etag-2"',
          Location: 'https://bucket.s3.amazonaws.com/test-file-2.txt',
          Key: '1704067201000-test-file.txt',
          Bucket: 'test-bucket',
        },
      };

      s3Service.uploadFile
        .mockResolvedValueOnce(mockS3Response1)
        .mockResolvedValueOnce(mockS3Response2);

      const result1 = await controller.uploadFile(mockFile);
      expect(s3Service.uploadFile).toHaveBeenCalledWith(
        mockFile,
        '1704067200000-test-file.txt',
      );
      expect(result1).toBe(mockS3Response1);

      const result2 = await controller.uploadFile(mockFile);
      expect(s3Service.uploadFile).toHaveBeenCalledWith(
        mockFile,
        '1704067201000-test-file.txt',
      );
      expect(result2).toBe(mockS3Response2);

      jest.spyOn(Date, 'now').mockRestore();
    });
  });
});
