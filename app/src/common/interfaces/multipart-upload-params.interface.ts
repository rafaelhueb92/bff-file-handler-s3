interface MultipartUploadParams {
  bucket: string;
  key: string;
  contentType: string;
  file: Express.Multer.File;
  onProgress?: (progress: UploadProgress) => void;
}

interface UploadProgress {
  partNumber: number;
  totalParts: number;
  percentage: number;
  key: string;
}
