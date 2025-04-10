variable "project_name" {
  description = "Name of the project"
  type        = string
}

variable "main_bucket_arn" {
  description = "ARN of the first S3 bucket"
  type        = string
}

variable "fallback_bucket_arn" {
  description = "ARN of the second S3 bucket"
  type        = string
}

variable "tags" {
  description = "Tags to apply to the IAM roles"
  type        = map(string)
  default     = {}
}

variable "environment" {
  description = "Environment name"
  type        = string
}