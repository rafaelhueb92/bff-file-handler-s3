output "main_bucket_name" {
  description = "Name of the main S3 bucket"
  value       = aws_s3_bucket.main.id
}

output "main_bucket_arn" {
  description = "ARN of the main S3 bucket"
  value       = aws_s3_bucket.main.arn
}

output "fallback_bucket_name" {
  description = "Name of the fallback S3 bucket"
  value       = aws_s3_bucket.fallback.id
}

output "fallback_bucket_arn" {
  description = "ARN of the fallback S3 bucket"
  value       = aws_s3_bucket.fallback.arn
}

output "kms_key_arn" {
  description = "ARN of the KMS key used for encryption"
  value       = aws_kms_key.s3.arn
}