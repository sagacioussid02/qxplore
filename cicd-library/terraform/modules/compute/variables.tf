variable "name_prefix" {
  description = "Prefix for resource names"
  type        = string
}

variable "common_tags" {
  description = "Common tags for all resources"
  type        = map(string)
}

variable "lambda_zip_path" {
  description = "Path to Lambda deployment ZIP file"
  type        = string
}

variable "lambda_handler" {
  description = "Lambda handler"
  type        = string
  default     = "lambda_handler.handler"
}

variable "lambda_runtime" {
  description = "Lambda runtime"
  type        = string
  default     = "python3.12"
}

variable "lambda_architectures" {
  description = "Lambda architectures"
  type        = list(string)
  default     = ["x86_64"]
}

variable "lambda_timeout" {
  description = "Lambda timeout in seconds"
  type        = number
  default     = 60
}

variable "lambda_env_vars" {
  description = "Environment variables for Lambda"
  type        = map(string)
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
