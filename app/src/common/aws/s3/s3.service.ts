import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { S3 as S3_SDK } from 'aws-sdk';
import * as fs from 'fs';
import { basename } from 'path';
import { ConfigService } from '@nestjs/config';
import { LoggerService } from '../../logger/logger.service';
import { S3Client as S3_Health, HeadBucketCommand } from '@aws-sdk/client-s3';
import { CircuitBreakerFactoryService } from '../../circuit-breaker/circuit-breaker.factory';
import * as CircuitBreaker from 'opossum';
import { UploadContext } from './context/upload.context';
import { RetryService } from '../../retry/retry.service';

@Injectable()
export class S3Service {
  private readonly primaryBucket: string;
  private readonly fallbackBucket: string;

  private readonly uploadBreaker: CircuitBreaker;
  private readonly healthBreaker: CircuitBreaker;

  constructor(
    private readonly configService: ConfigService,
    private readonly logger: LoggerService,
    private readonly S3: S3_SDK,
    private readonly S3_Health: S3_Health,
    private readonly breakerFactory: CircuitBreakerFactoryService,
    private readonly retryService: RetryService,
  ) {
    this.primaryBucket = this.configService.get<string>('s3.primaryBucket')!;
    this.fallbackBucket = this.configService.get<string>('s3.fallbackBucket')!;
    this.uploadBreaker = this.breakerFactory.createBreaker(
      this.uploadToS3.bind(this),
    );
    this.healthBreaker = this.breakerFactory.createBreaker(
      this.checkSingleBucketWithParams.bind(this),
    );

    this.uploadBreaker.fallback(
      async (upload: UploadContext, file: Express.Multer.File) => {
        this.logger.warn('File upload entering in fallback');
        try {
          const { Body, Key } = upload;
          const params: S3_SDK.PutObjectRequest = {
            Bucket: this.primaryBucket,
            Key,
            Body,
          };
          return await this.uploadToS3(
            { ...params, Bucket: this.fallbackBucket },
            file,
          );
        } catch (error) {
          this.logger.error(`Fallback upload failed: ${error.message}`);
          throw new Error('Both primary and fallback uploads failed');
        }
      },
    );

    this.healthBreaker.fallback(async () => {
      this.logger.warn('Health Check Bucket entering in fallback');
      try {
        return await this.checkSingleBucketWithParams(this.fallbackBucket);
      } catch (error) {
        this.logger.error(`Fallback Health Check failed: ${error.message}`);
        return false;
      }
    });
  }

  private async uploadToS3(
    params: S3_SDK.PutObjectRequest,
    file: Express.Multer.File,
  ) {
    return await this.retryService.execute(async () => {
      try {
        params.Body = fs.createReadStream(file.path);

        const result = await this.S3.upload(params).promise();
        fs.unlink(file.path, () => {});
        this.logger.info(
          `Upload to bucket ${params.Bucket} succeeded for ${file.originalname}`,
        );
        return result;
      } catch (error) {
        this.logger.warn(
          `Upload attempt failed for ${file.originalname} in the bucket ${params.Bucket}: ${error.message}`,
        );
        throw error;
      }
    }, `upload:${file.originalname}`);
  }

  async uploadFile(file: Express.Multer.File) {
    const { originalname, mimetype } = file;
    const key = `${Date.now()}-${basename(originalname)}`;

    const params: S3_SDK.PutObjectRequest = {
      Bucket: this.primaryBucket,
      Key: key,
      Body: undefined,
      ContentType: mimetype,
    };

    try {
      return await this.uploadBreaker.fire(params, file);
    } catch (error) {
      if (fs.existsSync(file.path)) fs.unlink(file.path, () => {});
      this.logger.error('All buckets failed to upload: ' + error.message);
      throw new ServiceUnavailableException(
        'All buckets failed, please try again later.',
      );
    }
  }

  async checkBucketHealth(): Promise<boolean> {
    try {
      return (await this.healthBreaker.fire(
        this.primaryBucket,
      )) as Promise<boolean>;
    } catch {
      this.logger.error('Both buckets failed.');
      return false;
    }
  }

  private async checkSingleBucketWithParams(
    bucketName: string,
  ): Promise<boolean> {
    return this.retryService.execute(async () => {
      await this.S3_Health.send(new HeadBucketCommand({ Bucket: bucketName }));
      this.logger.info(`Bucket "${bucketName} is Healthy`);
      return true;
    }, `healcheck:${bucketName}`);
  }
}
