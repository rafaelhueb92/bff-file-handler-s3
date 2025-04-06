import { Module } from '@nestjs/common';
import { FilesController } from './files.controller';
import { S3Module } from '../aws/s3/s3.module';
import { MulterModule } from '../multer/multer.module';

@Module({
  imports: [MulterModule, S3Module],
  controllers: [FilesController],
})
export class FilesModule {}
