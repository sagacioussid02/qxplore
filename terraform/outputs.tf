output "api_url" {
  description = "App Runner backend URL"
  value       = module.apprunner.service_url
}

output "frontend_url" {
  description = "Frontend URL (custom domain if configured, else raw CloudFront domain)"
  value = (
    var.use_custom_domain && var.root_domain != ""
      ? "https://${var.root_domain}"
      : "https://${module.cdn.cloudfront_domain_name}"
  )
}

output "cloudfront_domain" {
  description = "CloudFront domain name (without https://)"
  value       = module.cdn.cloudfront_domain_name
}

output "cloudfront_distribution_id" {
  description = "CloudFront distribution ID (for cache invalidation)"
  value       = module.cdn.cloudfront_distribution_id
}

output "frontend_bucket" {
  description = "S3 bucket name for frontend assets"
  value       = module.storage.frontend_bucket_id
}

output "ecr_repository_url" {
  description = "ECR repository URL for Docker pushes"
  value       = module.apprunner.ecr_repository_url
}
