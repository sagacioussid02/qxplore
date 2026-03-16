variable "name_prefix" {
  description = "Prefix for all resource names"
  type        = string
}

variable "image_uri" {
  description = "Full ECR image URI including tag (e.g. 123456.dkr.ecr.us-east-1.amazonaws.com/repo:latest)"
  type        = string
}

variable "cpu" {
  description = "App Runner CPU (e.g. '1 vCPU')"
  type        = string
  default     = "1 vCPU"
}

variable "memory" {
  description = "App Runner memory (e.g. '2 GB')"
  type        = string
  default     = "2 GB"
}

variable "port" {
  description = "Container port"
  type        = string
  default     = "8000"
}

variable "health_check_path" {
  description = "HTTP path for health checks"
  type        = string
  default     = "/health"
}

variable "environment_variables" {
  description = "Environment variables for the App Runner service"
  type        = map(string)
  default     = {}
}

variable "common_tags" {
  description = "Common tags for all resources"
  type        = map(string)
  default     = {}
}
