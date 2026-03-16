output "memory_bucket_id" {
  value = aws_s3_bucket.memory.id
}

output "memory_bucket_arn" {
  value = aws_s3_bucket.memory.arn
}

output "frontend_bucket_id" {
  value = aws_s3_bucket.frontend.id
}

output "frontend_bucket_arn" {
  value = aws_s3_bucket.frontend.arn
}

output "frontend_website_endpoint" {
  value = aws_s3_bucket_website_configuration.frontend.website_endpoint
}
