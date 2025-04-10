variable "project_name" {
  description = "Name of the project"
  type        = string
}

variable "environment" {
  description = "Environment name"
  type        = string
}

variable "force_destroy" {
  description = "Boolean that indicates all objects should be deleted from the bucket when destroying"
  type        = bool
  default     = false
}

variable "versioning_enabled" {
  description = "Enable versioning on the buckets"
  type        = bool
  default     = true
}

variable "account_id" {
  type        = string
}