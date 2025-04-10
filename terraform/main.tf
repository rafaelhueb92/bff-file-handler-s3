module "networking" {
  source = "./networking"

  project_name = var.project_name
  environment  = var.environment
  vpc_cidr     = var.vpc_cidr
}

module "s3" {
  source = "./s3"

  project_name = var.project_name
  environment  = var.environment
  account_id   = local.account_id
}

module "ecr" { 
  source = "./ecr"
  account_id   = local.account_id
  aws_region   = var.aws_region
  app_user     = var.app_user
  app_password = var.app_password
}

module "kms" {
  source = "./kms"
}

module "alb" {
  source = "./alb"

  project_name        = var.project_name
  environment         = var.environment
  vpc_id              = module.networking.vpc_id
  public_subnet_ids   = module.networking.public_subnet_ids
  container_port      = 3000
  health_check_path   = "/health/check"
  
  depends_on = [module.networking]
}

module "ecs" {
  source = "./ecs"

  project_name               = var.project_name
  environment                = var.environment
  vpc_id                     = module.networking.vpc_id
  private_subnet_ids         = module.networking.private_subnet_ids
  app_user                   = var.app_user
  app_password               = var.app_password
  main_bucket_name           = module.s3.main_bucket_name
  fallback_bucket_name       = module.s3.fallback_bucket_name
  target_group_arn           = module.alb.target_group_arn
  s3_retry_attempts          = var.s3_retry_attempts
  s3_fallback_retry_attempts = var.s3_fallback_retry_attempts
  s3_timeout                 = var.s3_timeout
  s3_conn_timeout            = var.s3_conn_timeout
  cb_timeout                 = var.cb_timeout
  cb_threshold               = var.cb_threshold
  cb_reset_timeout           = var.cb_reset_timeout
  kms_arn                    = module.kms.arn
  repository_url             = module.ecr.repository_url
  main_bucket_arn            = module.s3.main_bucket_arn
  fallback_bucket_arn        = module.s3.fallback_bucket_arn

  allowed_security_groups    = [module.alb.alb_security_group_id]

  depends_on = [module.networking, module.alb, module.s3, module.kms]

}