variable "domain_name" {
  description = "The domain name for the hosted zone"
  type        = string
}

variable "comment" {
  description = "A comment for the hosted zone"
  type        = string
  default     = ""
}

variable "vpc_config" {
  description = "VPC configuration for private hosted zone"
  type = object({
    vpc_id     = string
    vpc_region = string
  })
  default = null
}

variable "environment" {
  description = "Environment name"
  type        = string
  default     = "production"
}

variable "tags" {
  description = "Additional tags for the hosted zone"
  type        = map(string)
  default     = {}
}