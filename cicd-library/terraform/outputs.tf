output "memory_bucket_id" {
  description = "S3 bucket ID for conversation memory"
  value       = module.storage.memory_bucket_id
}

output "frontend_bucket_id" {
  description = "S3 bucket ID for frontend"
  value       = module.storage.frontend_bucket_id
}

output "api_gateway_endpoint" {
  description = "API Gateway HTTP API endpoint"
  value       = module.compute.api_gateway_endpoint
}

output "lambda_function_name" {
  description = "Lambda function name"
  value       = module.compute.lambda_function_name
}

output "cloudfront_domain_name" {
  description = "CloudFront distribution domain name"
  value       = module.cdn.cloudfront_domain_name
}

output "cloudfront_distribution_id" {
  description = "CloudFront distribution ID"
  value       = module.cdn.cloudfront_distribution_id
}
