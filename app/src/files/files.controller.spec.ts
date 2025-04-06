import { Test, TestingModule } from '@nestjs/testing';
import { FilesController } from './files.controller';
import { S3Service } from '../aws/s3/s3.service';

describe('FilesController', () => {
  let controller: FilesController;
  let s3Service: S3Service;

  const mockFile = {
    originalname: 'test.csv',
    mimetype: 'text/csv',
    path: '/tmp/test.csv',
    buffer: Buffer.from('mock file content'),
  } as Express.Multer.File;

  const mockS3Service = {
    uploadFile: jest.fn().mockResolvedValue({ success: true }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [FilesController],
      providers: [{ provide: S3Service, useValue: mockS3Service }],
    }).compile();

    controller = module.get<FilesController>(FilesController);
    s3Service = module.get<S3Service>(S3Service);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should call S3Service.uploadFile and return result', async () => {
    const result = await controller.uploadFile(mockFile);
    expect(s3Service.uploadFile).toHaveBeenCalledWith(mockFile);
    expect(result).toEqual({ success: true });
  });
});
