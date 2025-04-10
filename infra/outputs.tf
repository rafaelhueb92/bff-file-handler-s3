output "vpc_id" {
  description = "ID of the VPC"
  value       = module.networking.vpc_id
}

output "alb_dns_name" {
  description = "DNS name of the Application Load Balancer"
  value       = module.alb.alb_dns_name
}

output "main_bucket_name" {
  description = "Name of the main S3 bucket"
  value       = module.s3.main_bucket_name
}

output "fallback_bucket_name" {
  description = "Name of the fallback S3 bucket"
  value       = module.s3.fallback_bucket_name
}

output "ecs_cluster_name" {
  description = "Name of the ECS cluster"
  value       = module.ecs.cluster_name
}

output "certificate_arn" {
  description = "ARN of the SSL certificate"
  value       = module.acm.certificate_arn
  sensitive   = true
}

output "certificate_domain" {
  description = "Domain name of the certificate"
  value       = module.acm.certificate_domain
}

output "name_servers" {
  value = module.public_zone.name_servers
}