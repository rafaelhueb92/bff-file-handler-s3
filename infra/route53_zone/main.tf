resource "aws_route53_zone" "main" {
  name = var.domain_name
  comment = var.comment

  tags = merge(
    {
      "Name" = var.domain_name
      "Environment" = var.environment
    },
    var.tags
  )
}

resource "aws_route53_zone" "api" {
  name = "api.${var.domain_name}"

  tags = {
    sub_domain_prefix = "api"
  }
}

resource "aws_route53_record" "api-ns" {
  zone_id = aws_route53_zone.main.zone_id
  name    = "api.${var.domain_name}"
  type    = "NS"
  ttl     = "30"
  records = aws_route53_zone.api.name_servers
}