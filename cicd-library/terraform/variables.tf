variable "aws_region" {
  description = "AWS region"
  type        = string
  default     = "us-east-2"
}

variable "project_name" {
  description = "Name of the project"
  type        = string
}

variable "environment" {
  description = "Environment name (dev, test, prod)"
  type        = string
  default     = "dev"
}

variable "lambda_zip_path" {
  description = "Path to Lambda deployment ZIP file"
  type        = string
}

variable "bedrock_model_id" {
  description = "Bedrock model ID to use"
  type        = string
  default     = "anthropic.claude-3-sonnet-20240229-v1:0"
}

variable "lambda_timeout" {
  description = "Lambda timeout in seconds"
  type        = number
  default     = 60
}

variable "api_throttle_burst_limit" {
  description = "API Gateway throttle burst limit"
  type        = number
  default     = 10
}

variable "api_throttle_rate_limit" {
  description = "API Gateway throttle rate limit"
  type        = number
  default     = 5
}

variable "use_custom_domain" {
  description = "Whether to use a custom domain"
  type        = bool
  default     = false
}

variable "root_domain" {
  description = "Root domain name for custom domain setup"
  type        = string
  default     = ""
}
