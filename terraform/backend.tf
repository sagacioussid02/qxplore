# S3 backend — bucket, key, and region are passed at init time via -backend-config flags.
# One-time setup (run once before first deploy):
#   aws s3 mb s3://${AWS_ACCOUNT_ID}-terraform-state --region us-east-1
#   aws s3api put-bucket-versioning \
#     --bucket ${AWS_ACCOUNT_ID}-terraform-state \
#     --versioning-configuration Status=Enabled

terraform {
  backend "s3" {}
}
