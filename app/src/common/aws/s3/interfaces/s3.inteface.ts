// src/common/aws/s3/interfaces/s3.interface.ts
import { S3 } from 'aws-sdk';

export type SendData = S3.ManagedUpload.SendData;

export interface UploadResponse {
  success: boolean;
  message: string;
  key?: string;
  data?: SendData;
  error?: string;
}

export interface S3Params extends S3.PutObjectRequest {
  Bucket: string;
  Key: string;
  ContentType: string;
}
