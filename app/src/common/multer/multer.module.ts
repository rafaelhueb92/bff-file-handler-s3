import { BadRequestException, Module } from '@nestjs/common';
import { MulterModule as NestMulterModule } from '@nestjs/platform-express';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { diskStorage } from 'multer';
import { extname } from 'path';

@Module({
  imports: [
    ConfigModule.forRoot(), // Make sure this is imported in your root module
    NestMulterModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        storage: diskStorage({
          destination: `./${configService.get('MULTER_PATH_TMP')}`,
          filename: (req, file, callback) => {
            const uniqueSuffix =
              Date.now() + '-' + Math.round(Math.random() * 1e9);
            callback(null, `${uniqueSuffix}${extname(file.originalname)}`);
          },
        }),
        limits: {
          fileSize: 950 * 1024 * 1024, // Consider making this configurable too
        },
        fileFilter: (req, file, cb) => {
          if (file.mimetype === 'text/csv') {
            cb(null, true);
          } else {
            cb(new BadRequestException('Only CSV files are allowed'), false);
          }
        },
      }),
      inject: [ConfigService],
    }),
  ],
  exports: [NestMulterModule],
})
export class MulterModule {}
