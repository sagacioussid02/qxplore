# S3 + DynamoDB backend — values passed at init time via -backend-config flags.
# One-time setup (already done):
#   aws s3 mb s3://662246314589-terraform-state --region us-east-1
#   aws dynamodb create-table --table-name terraform-state-lock \
#     --attribute-definitions AttributeName=LockID,AttributeType=S \
#     --key-schema AttributeName=LockID,KeyType=HASH \
#     --billing-mode PAY_PER_REQUEST --region us-east-1

terraform {
  backend "s3" {}
}
