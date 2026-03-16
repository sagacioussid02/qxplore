variable "name_prefix" {
  description = "Prefix for S3 bucket names"
  type        = string
}

variable "common_tags" {
  description = "Common tags for all resources"
  type        = map(string)
}
