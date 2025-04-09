terraform {

  backend "s3" {
    bucket         = "bff-handler-terraform-state-180294221572"
    key            = "bff-handler/terraform.tfstate"
    region         = "us-west-2"
    encrypt        = true
    dynamodb_table = "bff-handler-terraform-state-lock"
  }
}

provider "aws" {
  default_tags {
    tags = {
      Environment = var.environment
      Project     = var.project_name
      ManagedBy   = "Terraform"
    }
  }
}

module "networking" {
  source = "./modules/networking"

  project_name = var.project_name
  environment  = var.environment
  vpc_cidr     = var.vpc_cidr
}

module "s3" {
  source = "./modules/s3"

  project_name = var.project_name
  environment  = var.environment
}

module "alb" {
  source = "./modules/alb"

  project_name      = var.project_name
  environment       = var.environment
  vpc_id           = module.networking.vpc_id
  public_subnet_ids = module.networking.public_subnet_ids
  container_port    = 3000
  health_check_path = "/health"
  
  depends_on = [module.networking]
}

module "ecs" {
  source = "./modules/ecs"

  project_name            = var.project_name
  environment            = var.environment
  vpc_id                 = module.networking.vpc_id
  private_subnet_ids     = module.networking.private_subnet_ids
  app_user               = var.app_user
  app_password           = var.app_password
  main_bucket_name       = module.s3.main_bucket_name
  fallback_bucket_name   = module.s3.fallback_bucket_name
  target_group_arn       = module.alb.target_group_arn
  s3_retry_attempts      = var.s3_retry_attempts
  s3_fallback_retry_attempts = var.s3_fallback_retry_attempts
  s3_timeout            = var.s3_timeout
  s3_conn_timeout       = var.s3_conn_timeout
  cb_timeout            = var.cb_timeout
  cb_threshold          = var.cb_threshold
  cb_reset_timeout      = var.cb_reset_timeout
  
  depends_on = [module.networking, module.alb, module.s3]
}