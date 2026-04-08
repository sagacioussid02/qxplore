locals {
  name_prefix = "${var.project_name}-${var.environment}"
  ecr_image   = "${var.aws_account_id}.dkr.ecr.${var.aws_region}.amazonaws.com/${local.name_prefix}-backend:${var.image_tag}"

  common_tags = {
    Project     = var.project_name
    Environment = var.environment
    ManagedBy   = "Terraform"
  }

  # The Route53 hosted zone to manage records in.
  # For a subdomain like qxplore.binosusai.com, set zone_domain = "binosusai.com"
  # For an apex domain like quantumanic.com, zone_domain can be left empty (defaults to root_domain).
  effective_zone = var.zone_domain != "" ? var.zone_domain : var.root_domain
}

# ── Frontend S3 bucket ────────────────────────────────────────────────────────
module "storage" {
  source      = "../cicd-library/terraform/modules/storage"
  name_prefix = local.name_prefix
  common_tags = local.common_tags
}

# ── CloudFront CDN ────────────────────────────────────────────────────────────
# We pass root_domain = "" to suppress the CDN module's internal Route53 records;
# we create them below with the correct zone lookup for subdomain support.
module "cdn" {
  source                    = "../cicd-library/terraform/modules/cdn"
  frontend_website_endpoint = module.storage.frontend_website_endpoint
  custom_domain_aliases     = var.use_custom_domain && var.root_domain != "" ? [var.root_domain] : []
  acm_certificate_arn       = var.use_custom_domain ? aws_acm_certificate_validation.cert[0].certificate_arn : null
  root_domain               = ""   # DNS handled below — avoids wrong zone lookup in module
  common_tags               = local.common_tags
}

# ── Backend on AWS App Runner ─────────────────────────────────────────────────
module "apprunner" {
  source      = "./modules/apprunner"
  name_prefix = local.name_prefix
  image_uri   = local.ecr_image
  cpu         = var.apprunner_cpu
  memory      = var.apprunner_memory
  common_tags = local.common_tags

  environment_variables = {
    ANTHROPIC_API_KEY         = var.anthropic_api_key
    OPENAI_API_KEY            = var.openai_api_key
    GOOGLE_API_KEY            = var.google_api_key
    SPORTTSDATAIO_API_KEY     = var.sporttsdataio_api_key
    SUPABASE_URL              = var.supabase_url
    SUPABASE_ANON_KEY         = var.supabase_anon_key
    SUPABASE_SERVICE_ROLE_KEY = var.supabase_service_role_key
    STRIPE_SECRET_KEY         = var.stripe_secret_key
    STRIPE_WEBHOOK_SECRET     = var.stripe_webhook_secret
    STRIPE_PRICE_ID           = var.stripe_price_id
    STRIPE_CREDITS_PER_PACK   = tostring(var.stripe_credits_per_pack)
    CORS_ORIGINS = jsonencode(
      var.use_custom_domain && var.root_domain != ""
        ? ["https://${var.root_domain}"]
        : ["https://${module.cdn.cloudfront_domain_name}"]
    )
  }
}

# ── Custom domain: ACM + Route53 ─────────────────────────────────────────────

# Look up the hosted zone (binosusai.com), not the subdomain itself
data "aws_route53_zone" "parent" {
  count        = var.use_custom_domain ? 1 : 0
  name         = local.effective_zone
  private_zone = false
}

# ACM cert — MUST be in us-east-1 for CloudFront
resource "aws_acm_certificate" "cert" {
  count             = var.use_custom_domain ? 1 : 0
  provider          = aws.us_east_1
  domain_name       = var.root_domain
  validation_method = "DNS"
  lifecycle { create_before_destroy = true }
  tags = local.common_tags
}

# DNS CNAME records ACM uses to prove domain ownership
resource "aws_route53_record" "cert_validation" {
  for_each = var.use_custom_domain ? {
    for dvo in aws_acm_certificate.cert[0].domain_validation_options :
    dvo.domain_name => dvo
  } : {}

  zone_id = data.aws_route53_zone.parent[0].zone_id
  name    = each.value.resource_record_name
  type    = each.value.resource_record_type
  ttl     = 300
  records = [each.value.resource_record_value]
}

# Wait for ACM to confirm the cert is valid before letting CloudFront use it
resource "aws_acm_certificate_validation" "cert" {
  count           = var.use_custom_domain ? 1 : 0
  provider        = aws.us_east_1
  certificate_arn = aws_acm_certificate.cert[0].arn
  validation_record_fqdns = [
    for r in aws_route53_record.cert_validation : r.fqdn
  ]
}

# Route53 Alias A record: qxplore.binosusai.com → CloudFront
resource "aws_route53_record" "cf_alias_ipv4" {
  count   = var.use_custom_domain ? 1 : 0
  zone_id = data.aws_route53_zone.parent[0].zone_id
  name    = var.root_domain
  type    = "A"

  alias {
    name                   = module.cdn.cloudfront_domain_name
    zone_id                = module.cdn.cloudfront_zone_id
    evaluate_target_health = false
  }
}

# Route53 Alias AAAA record (IPv6)
resource "aws_route53_record" "cf_alias_ipv6" {
  count   = var.use_custom_domain ? 1 : 0
  zone_id = data.aws_route53_zone.parent[0].zone_id
  name    = var.root_domain
  type    = "AAAA"

  alias {
    name                   = module.cdn.cloudfront_domain_name
    zone_id                = module.cdn.cloudfront_zone_id
    evaluate_target_health = false
  }
}
