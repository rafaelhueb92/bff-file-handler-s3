import * as CircuitBreaker from 'opossum';
import * as fs from 'fs';
import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { LoggerService } from '../../logger/logger.service';
import { CircuitBreakerFactoryService } from '../../circuit-breaker/circuit-breaker.factory';
import { S3Service } from './s3.service';
import { S3Params } from './interfaces/s3.inteface';

@Injectable()
export class S3ServiceCB {
  private static readonly MULTIPART_THRESHOLD_MB = 50;
  private static readonly MB_IN_BYTES = 1024 * 1024;

  private primaryBucket: string;
  private fallbackBucket: string;
  private uploadBreaker: CircuitBreaker;
  private healthBreaker: CircuitBreaker;
  private multiPartUploadBreaker: CircuitBreaker;

  constructor(
    private readonly configService: ConfigService,
    private readonly logger: LoggerService,
    private readonly breakerFactory: CircuitBreakerFactoryService,
    private readonly s3Service: S3Service,
  ) {
    this.validateConfig();
    this.initializeCircuitBreakers();
  }

  private validateConfig(): void {
    this.primaryBucket = this.configService.get<string>('s3.primaryBucket')!;
    this.fallbackBucket = this.configService.get<string>('s3.fallbackBucket')!;

    if (!this.primaryBucket || !this.fallbackBucket) {
      throw new Error('S3 bucket configuration is missing');
    }
  }

  private createS3Params(
    file: Express.Multer.File,
    key: string,
    bucket: string,
  ): S3Params {
    if (!file?.mimetype) {
      throw new Error('Invalid file object provided');
    }

    return {
      Bucket: bucket,
      Key: key,
      ContentType: file.mimetype,
    };
  }

  private initializeCircuitBreakers(): void {
    this.initializeMultiPartUploadBreaker();
    this.initializeUploadBreaker();
    this.initializeHealthBreaker();
  }

  private initializeMultiPartUploadBreaker(): void {
    this.multiPartUploadBreaker = this.breakerFactory.createBreaker(
      async (file: Express.Multer.File, key: string, bucket: string) => {
        return this.s3Service.multipartUploadS3(
          this.createS3Params(file, key, bucket),
          file,
        );
      },
    );

    this.multiPartUploadBreaker.fallback(
      async (file: Express.Multer.File, key: string) => {
        this.logger.warn(
          `Multipart upload to primary bucket failed, attempting fallback for key: ${key}`,
        );
        try {
          return await this.s3Service.multipartUploadS3(
            this.createS3Params(file, key, this.fallbackBucket),
            file,
          );
        } catch (error) {
          fs.unlink(file.path, () => {});
          this.logger.error('Fallback multipart upload failed:', error);
          throw new Error(`Fallback multipart upload failed: ${error.message}`);
        }
      },
    );
  }

  private initializeUploadBreaker(): void {
    this.uploadBreaker = this.breakerFactory.createBreaker(
      async (file: Express.Multer.File, key: string, bucket: string) => {
        return this.s3Service.uploadS3(
          this.createS3Params(file, key, bucket),
          file,
        );
      },
    );

    this.uploadBreaker.fallback(
      async (file: Express.Multer.File, key: string) => {
        this.logger.warn(
          `Upload to primary bucket failed, attempting fallback for key: ${key}`,
        );
        try {
          return await this.s3Service.uploadS3(
            this.createS3Params(file, key, this.fallbackBucket),
            file,
          );
        } catch (error) {
          fs.unlink(file.path, () => {});
          this.logger.error('Fallback upload failed:', error);
          throw new Error(`Fallback upload failed: ${error.message}`);
        }
      },
    );
  }

  private initializeHealthBreaker(): void {
    this.healthBreaker = this.breakerFactory.createBreaker(
      (bucketName: string) =>
        this.s3Service.checkSingleBucketWithParams(bucketName),
    );

    this.healthBreaker.fallback(async () => {
      this.logger.warn(
        `Health check failed for primary bucket, checking fallback bucket`,
      );
      try {
        return await this.s3Service.checkSingleBucketWithParams(
          this.fallbackBucket,
        );
      } catch (error) {
        this.logger.error('Health check fallback failed:', error);
        return false;
      }
    });
  }

  private isMultipartUpload(fileSizeBytes: number): boolean {
    return (
      fileSizeBytes / S3ServiceCB.MB_IN_BYTES >
      S3ServiceCB.MULTIPART_THRESHOLD_MB
    );
  }

  async uploadFile(file: Express.Multer.File, key: string) {
    try {
      if (this.isMultipartUpload(file.size)) {
        void this.multiPartUploadBreaker.fire(file, key, this.primaryBucket);
        return {
          success: true,
          message: 'Large file upload Async via multipart upload',
          key,
        };
      }

      const result = await this.uploadBreaker.fire(
        file,
        key,
        this.primaryBucket,
      );
      return {
        success: true,
        message: 'File uploaded successfully',
        key,
        data: result,
      };
    } catch (error) {
      this.logger.error('Upload failed on all attempts:', error);
      throw new ServiceUnavailableException(
        'Upload service temporarily unavailable. Please try again later.',
        {
          cause: error,
          description: 'Both primary and fallback upload attempts failed',
        },
      );
    }
  }

  async checkBucketHealth(): Promise<boolean> {
    try {
      return (await this.healthBreaker.fire(
        this.primaryBucket,
      )) as Promise<boolean>;
    } catch (error) {
      this.logger.error('Health check failed on all attempts:', error);
      return false;
    }
  }
}
