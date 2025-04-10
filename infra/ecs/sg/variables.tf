variable "project_name" {
  description = "Name of the project"
  type        = string
}

variable "vpc_id" {
  description = "ID of the VPC"
  type        = string
}

variable "allowed_security_groups" {
  description = "List of security group IDs allowed to access ECS tasks"
  type        = list(string)
}

variable "tags" {
  description = "Tags to apply to the ECS tasks security group"
  type        = map(string)
  default     = {}
}