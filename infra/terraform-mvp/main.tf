module "s3" {
  source = "./s3"

  project_name = var.project_name
  environment  = var.environment
}