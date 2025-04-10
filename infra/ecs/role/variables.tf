variable "project_name" {
  description = "Name of the project"
  type        = string
}

variable "first_bucket_arn" {
  description = "ARN of the first S3 bucket"
  type        = string
}

variable "second_bucket_arn" {
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