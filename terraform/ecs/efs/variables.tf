variable "project_name" {
  description = "Name of the project"
  type        = string
}

variable "private_subnet_ids" {
  description = "IDs of private subnets"
  type        = list(string)
}

variable "sg_ecs_tasks_id" {
  type        = string
}
variable "vpc_id" {
  type        = string
}

