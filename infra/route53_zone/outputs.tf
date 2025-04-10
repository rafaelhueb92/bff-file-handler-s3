output "zone_id" {
  description = "The Hosted Zone ID"
  value       = aws_route53_zone.main.zone_id
}

output "name_servers" {
  description = "A list of name servers in the hosted zone"
  value       = aws_route53_zone.main.name_servers
}