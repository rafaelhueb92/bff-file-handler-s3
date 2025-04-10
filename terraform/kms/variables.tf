variable "description" {
  type    = string
  default = "This is a KMS Key"
}

variable "deletion_window_in_days" {
  type    = number
  default = 7
}