data "aws_caller_identity" "current" {}

locals {
  aliases = var.use_custom_domain && var.root_domain != "" ? [
    var.root_domain,
    "www.${var.root_domain}"
  ] : []

  name_prefix = "${var.project_name}-${var.environment}"

  common_tags = {
    Project     = var.project_name
    Environment = var.environment
    ManagedBy   = "terraform"
  }
}

# Storage module
module "storage" {
  source = "./modules/storage"

  name_prefix = local.name_prefix
  common_tags = local.common_tags
}

# Compute module
module "compute" {
  source = "./modules/compute"

  name_prefix = local.name_prefix
  common_tags = local.common_tags

  lambda_zip_path = var.lambda_zip_path
  lambda_timeout  = var.lambda_timeout

  lambda_env_vars = {
    CORS_ORIGINS     = var.use_custom_domain && var.root_domain != "" ? "https://${var.root_domain},https://www.${var.root_domain}" : "https://${module.cdn.cloudfront_domain_name}"
    S3_BUCKET        = module.storage.memory_bucket_id
    USE_S3           = "true"
    BEDROCK_MODEL_ID = var.bedrock_model_id
  }

  api_throttle_burst_limit = var.api_throttle_burst_limit
  api_throttle_rate_limit  = var.api_throttle_rate_limit
}

# CDN module
module "cdn" {
  source = "./modules/cdn"

  common_tags                = local.common_tags
  frontend_website_endpoint  = module.storage.frontend_website_endpoint
  custom_domain_aliases      = local.aliases
  acm_certificate_arn        = var.use_custom_domain && var.root_domain != "" ? aws_acm_certificate.site[0].arn : null
  root_domain                = var.root_domain
}

# Optional: Custom domain configuration
data "aws_route53_zone" "root" {
  count        = var.use_custom_domain && var.root_domain != "" ? 1 : 0
  name         = var.root_domain
  private_zone = false
}

resource "aws_acm_certificate" "site" {
  count                     = var.use_custom_domain && var.root_domain != "" ? 1 : 0
  provider                  = aws.us_east_1
  domain_name               = var.root_domain
  subject_alternative_names = ["www.${var.root_domain}"]
  validation_method         = "DNS"
  lifecycle { create_before_destroy = true }
  tags = local.common_tags
}

resource "aws_route53_record" "site_validation" {
  for_each = var.use_custom_domain && var.root_domain != "" ? {
    for dvo in aws_acm_certificate.site[0].domain_validation_options :
    dvo.domain_name => dvo
  } : {}

  zone_id = data.aws_route53_zone.root[0].zone_id
  name    = each.value.resource_record_name
  type    = each.value.resource_record_type
  ttl     = 300
  records = [each.value.resource_record_value]
}

resource "aws_acm_certificate_validation" "site" {
  count           = var.use_custom_domain && var.root_domain != "" ? 1 : 0
  provider        = aws.us_east_1
  certificate_arn = aws_acm_certificate.site[0].arn
  validation_record_fqdns = [
    for r in aws_route53_record.site_validation : r.fqdn
  ]
}
