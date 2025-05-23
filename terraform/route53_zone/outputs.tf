output "zone_id" {
  description = "The Hosted Zone ID"
  value       = aws_route53_zone.main.zone_id
}

output "name_servers" {
  description = "A list of name servers in the hosted zone"
  value       = aws_route53_zone.main.name_servers
}

output "domain_name_without_dot" {
  description = "The domain name without the trailing dot"
  value       = trimsuffix(aws_route53_zone.main.name, ".")
}

output "domain_name" {
  description = "The domain name of the Route 53 hosted zone"
  value       = aws_route53_zone.main.name
}
