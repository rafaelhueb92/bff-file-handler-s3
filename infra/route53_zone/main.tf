resource "aws_route53_zone" "main" {
  name = var.domain_name
  comment = var.comment

  dynamic "vpc" {
    for_each = var.vpc_config != null ? [var.vpc_config] : []
    content {
      vpc_id = vpc.value.vpc_id
      vpc_region = vpc.value.vpc_region
    }
  }

  tags = merge(
    {
      "Name" = var.domain_name
      "Environment" = var.environment
    },
    var.tags
  )
}