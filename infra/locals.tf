locals {
  bucket_main     = "bff-handler-${data.aws_caller_identity.current.account_id}-main"
  bucket_fallback = "bff-handler-${data.aws_caller_identity.current.account_id}-fallback"
}
