output "service_url" {
  description = "App Runner service URL (https://...)"
  value       = "https://${aws_apprunner_service.backend.service_url}"
}

output "service_arn" {
  description = "App Runner service ARN"
  value       = aws_apprunner_service.backend.arn
}

output "ecr_repository_url" {
  description = "ECR repository URL (without tag)"
  value       = aws_ecr_repository.backend.repository_url
}
