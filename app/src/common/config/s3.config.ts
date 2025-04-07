export default () => ({
  s3: {
    primaryBucket: process.env.AWS_S3_BUCKET,
    fallbackBucket: process.env.AWS_S3_BUCKET_BACKUP,
    retry: {
      attempts: parseInt(process.env.S3_RETRY_ATTEMPTS || '3', 10),
      fallbackAttempts: parseInt(
        process.env.S3_FALLBACK_RETRY_ATTEMPTS || '2',
        10,
      ),
    },
    connection: {
      timeout: parseInt(process.env.S3_RETRY_ATTEMPTS || '3', 10),
      connectTimeout: parseInt(process.env.S3_RETRY_ATTEMPTS || '3', 10),
    },
    circuitBreaker: {
      timeout: parseInt(process.env.CB_TIMEOUT || '30000', 10),
      errorThreshold: parseInt(process.env.CB_THRESHOLD || '50', 10),
      resetTimeout: parseInt(process.env.CB_RESET_TIMEOUT || '10000', 10),
    },
  },
});
