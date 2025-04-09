import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { S3 as S3_SDK } from 'aws-sdk';
import * as fs from 'fs';
import { LoggerService } from '../../logger/logger.service';
import { S3Client as S3_Health, HeadBucketCommand } from '@aws-sdk/client-s3';
import { RetryService } from '../../retry/retry.service';

@Injectable()
export class S3Service {
  constructor(
    private readonly logger: LoggerService,
    private readonly S3: S3_SDK,
    private readonly S3_Health: S3_Health,
    private readonly retryService: RetryService,
  ) {}

  async multipartUploadS3(
    params: S3_SDK.PutObjectRequest,
    file: Express.Multer.File,
  ): Promise<S3_SDK.CompleteMultipartUploadOutput> {
    let uploadId: string = '';

    const { Bucket, Key } = params;

    return await this.retryService.execute(async () => {
      try {
        const fileSize = fs.statSync(file.path).size;
        const partSize = 5 * 1024 * 1024;
        const numParts = Math.ceil(fileSize / partSize);
        const multipartUpload = await this.S3.createMultipartUpload({
          Bucket,
          Key,
          ContentType: file.mimetype,
          ServerSideEncryption: 'AES256',
        }).promise();

        uploadId = multipartUpload.UploadId as string;
        this.logger.info(
          `Started multipart upload for ${Key} with ID: ${uploadId}`,
        );

        const uploadedParts: S3_SDK.CompletedPart[] = [];

        for (let partNumber = 1; partNumber <= numParts; partNumber++) {
          const start = (partNumber - 1) * partSize;
          const end = Math.min(start + partSize, fileSize);

          const partBuffer = await this.readFilePart(file.path, start, end);

          const uploadResult = await this.uploadPartWithTimeout({
            Bucket,
            Key,
            uploadId,
            partNumber,
            partBuffer,
          });

          uploadedParts.push({
            ETag: uploadResult.ETag,
            PartNumber: partNumber,
          });

          this.logger.info(
            `Successfully uploaded part ${partNumber}/${numParts} (${((partNumber / numParts) * 100).toFixed(2)}%)`,
          );
        }

        const result = await this.S3.completeMultipartUpload({
          Bucket,
          Key,
          UploadId: uploadId,
          MultipartUpload: { Parts: uploadedParts },
        }).promise();

        this.logger.info(`Successfully completed multipart upload for ${Key}`);

        fs.unlink(file.path, () => {});

        return result;
      } catch (error) {
        this.logger.error(`Upload failed: ${error.message}`);

        if (uploadId) {
          try {
            await this.S3.abortMultipartUpload({
              Bucket,
              Key,
              UploadId: uploadId,
            }).promise();
            this.logger.info(`Aborted multipart upload for ${Key}`);
          } catch (abortError) {
            this.logger.error(
              `Failed to abort multipart upload: ${abortError.message}`,
            );
          }
        }

        throw error;
      }
    }, `multipartUploadS3:${file.originalname}`);
  }

  private async readFilePart(
    filePath: string,
    start: number,
    end: number,
  ): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const chunks: Buffer[] = [];
      const stream = fs.createReadStream(filePath, {
        start,
        end: end - 1,
        highWaterMark: 1024 * 1024,
      });

      stream.on('data', (chunk: Buffer<ArrayBufferLike>) => chunks.push(chunk));
      stream.on('error', (error) => reject(error));
      stream.on('end', () => resolve(Buffer.concat(chunks)));
    });
  }

  private async uploadPartWithTimeout({
    Bucket,
    Key,
    uploadId,
    partNumber,
    partBuffer,
  }: {
    Bucket: string;
    Key: string;
    uploadId: string;
    partNumber: number;
    partBuffer: Buffer;
  }): Promise<S3_SDK.UploadPartOutput> {
    return new Promise((resolve, reject) => {
      const params: S3_SDK.UploadPartRequest = {
        Bucket,
        Key,
        PartNumber: partNumber,
        UploadId: uploadId,
        Body: partBuffer,
        ContentLength: partBuffer.length,
      };

      const uploadTimeout = setTimeout(() => {
        reject(new Error(`Upload timeout for part ${partNumber}`));
      }, 300000);

      this.S3.uploadPart(params)
        .promise()
        .then((result) => {
          clearTimeout(uploadTimeout);
          resolve(result);
        })
        .catch((error) => {
          clearTimeout(uploadTimeout);
          reject(error);
        });
    });
  }

  async uploadS3(params: S3_SDK.PutObjectRequest, file: Express.Multer.File) {
    return await this.retryService.execute(async () => {
      try {
        this.logger.info(`Uploading with standard upload`);

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
    }, `uploadS3:${file.originalname}`);
  }

  async checkSingleBucketWithParams(bucketName: string): Promise<boolean> {
    this.logger.info(`Checking Health of Bucket ${bucketName}`);
    return this.retryService.execute(async () => {
      try {
        this.logger.info(
          `Checking Health of Bucket ${bucketName} into the retry`,
        );
        await this.S3_Health.send(
          new HeadBucketCommand({ Bucket: bucketName }),
        );
        this.logger.info(`Bucket "${bucketName}" is Healthy`);
        return true;
      } catch (error) {
        this.logger.error('Health Check Failed: ' + error.message);
        throw new ServiceUnavailableException(
          'All buckets failed, please try again later.',
        );
      }
    }, `checkSingleBucketWithParams:${bucketName}`);
  }
}
