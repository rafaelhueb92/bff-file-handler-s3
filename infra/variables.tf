variable "aws_region" {
  description = "AWS region"
  type        = string
  default     = "us-east-1"
}

variable "environment" {
  description = "Environment name"
  type        = string
}

variable "project_name" {
  description = "Project name"
  type        = string
  default     = "bff-handler"
}

variable "app_user" {
  description = "App user"
  type        = string
}

variable "app_password" {
  description = "App password"
  type        = string
}

variable "vpc_cidr" {
  description = "VPC CIDR block"
  type        = string
  default     = "10.0.0.0/16"
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