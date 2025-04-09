# modules/s3/main.tf

data "aws_caller_identity" "current" {}

resource "aws_s3_bucket" "main" {
  bucket = "bff-handler-${data.aws_caller_identity.current.account_id}-main"

  tags = {
    Name        = "Main Bucket"
    Environment = var.environment
  }
}

resource "aws_s3_bucket" "fallback" {
  bucket = "bff-handler-${data.aws_caller_identity.current.account_id}-fallback"

  tags = {
    Name        = "Fallback Bucket"
    Environment = var.environment
  }
}

resource "aws_s3_bucket_versioning" "main" {
  bucket = aws_s3_bucket.main.id
  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_replication_configuration" "main" {
  bucket = aws_s3_bucket.main.id
  role   = aws_iam_role.replication.arn

  rule {
    id     = "main-to-fallback"
    status = "Enabled"

    destination {
      bucket = aws_s3_bucket.fallback.arn
      encryption_configuration {
        replica_kms_key_id = aws_kms_key.s3.arn
      }
    }
  }
}

resource "aws_kms_key" "s3" {
  description             = "S3 bucket encryption key"
  deletion_window_in_days = 7
}