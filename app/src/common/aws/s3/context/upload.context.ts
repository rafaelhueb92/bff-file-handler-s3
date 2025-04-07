import { ReadStream } from 'fs';

export type UploadContext = {
  Bucket: string;
  Key: string;
  Body: ReadStream;
};
