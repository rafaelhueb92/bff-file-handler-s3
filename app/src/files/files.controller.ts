import {
  Controller,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { S3ServiceCB } from '../common/aws/s3/s3.service.cb';
import { basename } from 'path';

@Controller('files')
export class FilesController {
  constructor(private readonly s3Service: S3ServiceCB) {}

  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  uploadFile(@UploadedFile() file: Express.Multer.File) {
    const Key = `${Date.now()}-${basename(file.originalname)}`;
    return this.s3Service.uploadFile(file, Key);
  }
}
