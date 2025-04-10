aws_region   = "us-west-1"  
environment  = "prod"
project_name = "bff-handler"

# VPC Configuration
vpc_cidr        = "10.0.0.0/16"
public_subnets  = ["10.0.1.0/24", "10.0.2.0/24"]
private_subnets = ["10.0.10.0/24", "10.0.11.0/24"]

# Application Environment Variables
app_user     = "ADMIN"
app_password = "ADMIN"

# S3 Configuration
account_id              = "180294221572"  # Your AWS account ID
force_destroy          = false
versioning_enabled     = true

# S3 Application Settings
s3_retry_attempts          = 3
s3_fallback_retry_attempts = 2
s3_timeout                 = 300000  # 5 minutes
s3_conn_timeout            = 60000   # 1 minute

# Circuit Breaker Settings
cb_timeout       = 30000
cb_threshold     = 50
cb_reset_timeout = 10000

# ECS Fargate Configuration
container_port = 3000
cpu           = 1024    # 1 vCPU
memory        = 2048    # 2GB RAM
desired_count = 2       # Number of tasks to run

# Auto Scaling Configuration
min_capacity     = 1
max_capacity     = 4
scale_up_threshold   = 75  # CPU utilization percentage to scale up
scale_down_threshold = 25  # CPU utilization percentage to scale down

# ALB Configuration
health_check_path = "/health"
alb_ssl_policy    = "ELBSecurityPolicy-2016-08"

# Logs Configuration
log_retention_days = 30

# Tags
additional_tags = {
  Owner       = "DevOps"
  Terraform   = "true"
  Environment = "prod"
}

# Backup Configuration
backup_retention_days = 7

# Monitoring Configuration
enable_enhanced_monitoring = true
monitoring_interval       = 60

# Security Configuration
allowed_cidr_blocks = ["0.0.0.0/0"]  # Restrict this in production

# Domain Configuration (if using custom domain)
# domain_name        = "your-domain.com"
# create_dns_record  = true
# route53_zone_id    = "your-zone-id"

# KMS Configuration
kms_deletion_window = 7
enable_key_rotation = true

# Network Configuration
enable_vpc_flow_logs     = true
enable_dns_hostnames     = true
enable_dns_support       = true
enable_nat_gateway       = true
single_nat_gateway      = false  # Set to true to save costs in non-prod environments

# Container Configuration
container_insights_enabled = true
enable_execute_command    = true  # Enables ECS Exec capability

# Application Environment Specific Settings
environment_variables = {
  APP_USER                    = "ADMIN"
  APP_PASSWORD                = "ADMIN"
  AWS_S3_BUCKET              = "bff-handler-180294221572-main"
  AWS_S3_BUCKET_BACKUP       = "bff-handler-180294221572-fallback"
  S3_RETRY_ATTEMPTS          = "3"
  S3_FALLBACK_RETRY_ATTEMPTS = "2"
  S3_TIME_OUT                = "300000"
  S3_CONN_TIME_OUT           = "60000"
  CB_TIMEOUT                 = "30000"
  CB_THRESHOLD               = "50"
  CB_RESET_TIMEOUT          = "10000"
  MULTER_PATH_TMP           = "./tmp"
}

# Secrets Management
secrets_management = {
  enable_secrets_manager = true
  secrets_retention_days = 7
}

# Backup Strategy
backup_strategy = {
  enable_backup        = true
  backup_window        = "03:00-04:00"
  retention_period     = 7
  enable_point_in_time = true
}

# Performance Configuration
performance_insights = {
  enabled          = true
  retention_period = 7
}

# Cost Management
cost_allocation_tags = {
  CostCenter = "DevOps"
  Project    = "BFF-Handler"
}

# Compliance
compliance_settings = {
  enable_encryption_at_rest = true
  enable_encryption_in_transit = true
  enable_audit_logging = true
}

# Disaster Recovery
dr_settings = {
  enable_cross_region_backup = false  # Set to true if needed
  # dr_region                = "us-east-1"  # Uncomment and set if cross-region DR is needed
}

# CERTIFCATE
domain_name     = "bffiles3.com"
route53_zone_id = "Z1234567890ABC"