variable "project_name" {
  description = "Project name used as a prefix for all AWS resources"
  type        = string
  default     = "quantumanic"
}

variable "environment" {
  description = "Deployment environment (dev, staging, prod)"
  type        = string
  default     = "prod"
}

variable "aws_region" {
  description = "AWS region to deploy into"
  type        = string
  default     = "us-east-1"
}

variable "aws_account_id" {
  description = "AWS account ID (used for ECR URL)"
  type        = string
}

# App Runner sizing
variable "apprunner_cpu" {
  description = "App Runner vCPU allocation"
  type        = string
  default     = "1 vCPU"
}

variable "apprunner_memory" {
  description = "App Runner memory allocation"
  type        = string
  default     = "2 GB"
}

# Custom domain (optional)
variable "use_custom_domain" {
  description = "Whether to configure a custom domain via Route53 + ACM"
  type        = bool
  default     = false
}

variable "root_domain" {
  description = "Root domain name (e.g. quantumanic.com). Required if use_custom_domain = true"
  type        = string
  default     = ""
}

# ── Application secrets (set via TF_VAR_* env vars in CI/CD, never commit values) ──

variable "anthropic_api_key" {
  type      = string
  sensitive = true
  default   = ""
}

variable "openai_api_key" {
  type      = string
  sensitive = true
  default   = ""
}

variable "google_api_key" {
  type      = string
  sensitive = true
  default   = ""
}

variable "sporttsdataio_api_key" {
  type      = string
  sensitive = true
  default   = ""
}

variable "supabase_url" {
  type    = string
  default = ""
}

variable "supabase_anon_key" {
  type      = string
  sensitive = true
  default   = ""
}

variable "supabase_service_role_key" {
  type      = string
  sensitive = true
  default   = ""
}

variable "stripe_secret_key" {
  type      = string
  sensitive = true
  default   = ""
}

variable "stripe_webhook_secret" {
  type      = string
  sensitive = true
  default   = ""
}

variable "stripe_price_id" {
  type    = string
  default = ""
}

variable "stripe_credits_per_pack" {
  type    = number
  default = 5
}
