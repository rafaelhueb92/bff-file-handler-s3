variable "project_name" {
  description = "Name of the project"
  type        = string
}

variable "environment" {
  description = "Environment name"
  type        = string
}

variable "vpc_id" {
  description = "ID of the VPC"
  type        = string
}

variable "private_subnet_ids" {
  description = "IDs of private subnets"
  type        = list(string)
}

variable "app_user" {
  description = "Application user"
  type        = string
}

variable "app_password" {
  description = "Application password"
  type        = string
  sensitive   = true
}

variable "main_bucket_name" {
  description = "Name of the main S3 bucket"
  type        = string
}

variable "fallback_bucket_name" {
  description = "Name of the fallback S3 bucket"
  type        = string
}

variable "target_group_arn" {
  description = "ARN of the ALB target group"
  type        = string
}

variable "container_port" {
  description = "Port on which the container is listening"
  type        = number
  default     = 3000
}

variable "cpu" {
  description = "CPU units for the task"
  type        = number
  default     = 256
}

variable "memory" {
  description = "Memory for the task"
  type        = number
  default     = 512
}

variable "desired_count" {
  description = "Desired number of tasks"
  type        = number
  default     = 2
}

variable "s3_retry_attempts" {
  type    = number
  default = 3
}

variable "s3_fallback_retry_attempts" {
  type    = number
  default = 2
}

variable "s3_timeout" {
  type    = number
  default = 10000
}

variable "s3_conn_timeout" {
  type    = number
  default = 3000
}

variable "cb_timeout" {
  type    = number
  default = 30000
}

variable "cb_threshold" {
  type    = number
  default = 50
}

variable "cb_reset_timeout" {
  type    = number
  default = 10000
}