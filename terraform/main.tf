locals {
  name_prefix = "${var.project_name}-${var.environment}"
  ecr_image   = "${var.aws_account_id}.dkr.ecr.${var.aws_region}.amazonaws.com/${local.name_prefix}-backend:latest"

  common_tags = {
    Project     = var.project_name
    Environment = var.environment
    ManagedBy   = "Terraform"
  }
}

# ── Frontend S3 bucket (reuse cicd-library storage module) ───────────────────
module "storage" {
  source      = "../cicd-library/terraform/modules/storage"
  name_prefix = local.name_prefix
  common_tags = local.common_tags
}

# ── CloudFront CDN (reuse cicd-library cdn module) ────────────────────────────
module "cdn" {
  source                    = "../cicd-library/terraform/modules/cdn"
  frontend_website_endpoint = module.storage.frontend_website_endpoint
  custom_domain_aliases     = var.use_custom_domain && var.root_domain != "" ? [var.root_domain, "www.${var.root_domain}"] : []
  acm_certificate_arn       = var.use_custom_domain ? aws_acm_certificate_validation.cert[0].certificate_arn : null
  root_domain               = var.use_custom_domain ? var.root_domain : ""
  common_tags               = local.common_tags
}

# ── Backend on AWS App Runner ─────────────────────────────────────────────────
module "apprunner" {
  source     = "./modules/apprunner"
  name_prefix = local.name_prefix
  image_uri  = local.ecr_image
  cpu        = var.apprunner_cpu
  memory     = var.apprunner_memory
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
    # Allow requests from CloudFront frontend; App Runner always has HTTPS
    CORS_ORIGINS              = jsonencode(
      var.use_custom_domain && var.root_domain != ""
        ? ["https://${var.root_domain}", "https://www.${var.root_domain}"]
        : ["https://${module.cdn.cloudfront_domain_name}"]
    )
  }
}

# ── Optional: ACM certificate for custom domain (must be in us-east-1) ───────
resource "aws_acm_certificate" "cert" {
  count             = var.use_custom_domain ? 1 : 0
  domain_name       = var.root_domain
  subject_alternative_names = ["www.${var.root_domain}"]
  validation_method = "DNS"

  lifecycle {
    create_before_destroy = true
  }

  tags = local.common_tags
}

resource "aws_acm_certificate_validation" "cert" {
  count           = var.use_custom_domain ? 1 : 0
  certificate_arn = aws_acm_certificate.cert[0].arn
}
