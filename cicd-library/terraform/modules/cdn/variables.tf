variable "common_tags" {
  description = "Common tags for all resources"
  type        = map(string)
}

variable "frontend_website_endpoint" {
  description = "S3 website endpoint for frontend"
  type        = string
}

variable "custom_domain_aliases" {
  description = "Custom domain aliases for CloudFront"
  type        = list(string)
  default     = []
}

variable "acm_certificate_arn" {
  description = "ACM certificate ARN for custom domain"
  type        = string
  default     = null
}

variable "root_domain" {
  description = "Root domain name"
  type        = string
  default     = ""
}
