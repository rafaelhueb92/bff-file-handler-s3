import { Module } from '@nestjs/common';
import { FilesController } from './files.controller';
import { S3Module } from '../common/aws/s3/s3.module';
import { MulterModule } from '../common/multer/multer.module';
import { LoggerModule } from '../common/logger/logger.module';

@Module({
  imports: [MulterModule, S3Module, LoggerModule],
  controllers: [FilesController],
})
export class FilesModule {}
