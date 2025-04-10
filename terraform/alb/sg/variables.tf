variable "vpc_id" {
  description = "VPC ID for the ALB"
  type        = string
}

variable "project_name" {
  description = "Project name for tagging resources"
  type        = string
}

variable "environment" {
  description = "Environment name"
  type        = string
}