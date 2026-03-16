# Bootstrap Terraform state infrastructure.
#
# This config uses LOCAL state (terraform.tfstate in this directory) because
# it creates the remote state backend itself — you can't use remote state to
# create remote state (bootstrapping problem).
#
# Run once per AWS account:
#   cd terraform/bootstrap
#   terraform init
#   terraform apply
#
# After this, all other Terraform configs in this repo use the S3+DynamoDB backend.
# Commit bootstrap/terraform.tfstate to the repo so the state is not lost.

terraform {
  required_version = ">= 1.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
  # Intentionally NO backend block — local state only
}

provider "aws" {
  region = var.aws_region
}

variable "aws_region" {
  description = "AWS region for state resources"
  type        = string
  default     = "us-east-1"
}

data "aws_caller_identity" "current" {}

locals {
  account_id   = data.aws_caller_identity.current.account_id
  bucket_name  = "${local.account_id}-terraform-state"
  table_name   = "terraform-state-lock"
}

# ── S3 state bucket ───────────────────────────────────────────────────────────

resource "aws_s3_bucket" "state" {
  bucket = local.bucket_name

  lifecycle {
    prevent_destroy = true  # safety: never accidentally delete state
  }

  tags = { ManagedBy = "terraform-bootstrap" }
}

resource "aws_s3_bucket_versioning" "state" {
  bucket = aws_s3_bucket.state.id
  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "state" {
  bucket = aws_s3_bucket.state.id
  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

resource "aws_s3_bucket_public_access_block" "state" {
  bucket                  = aws_s3_bucket.state.id
  block_public_acls       = true
  ignore_public_acls      = true
  block_public_policy     = true
  restrict_public_buckets = true
}

# ── DynamoDB lock table ───────────────────────────────────────────────────────

resource "aws_dynamodb_table" "lock" {
  name         = local.table_name
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "LockID"

  attribute {
    name = "LockID"
    type = "S"
  }

  lifecycle {
    prevent_destroy = true  # safety: losing the lock table corrupts concurrent state ops
  }

  tags = { ManagedBy = "terraform-bootstrap" }
}

# ── Outputs ───────────────────────────────────────────────────────────────────

output "state_bucket" {
  value = aws_s3_bucket.state.bucket
}

output "lock_table" {
  value = aws_dynamodb_table.lock.name
}

output "backend_config" {
  description = "Pass these -backend-config flags to terraform init in other configs"
  value = {
    bucket         = aws_s3_bucket.state.bucket
    region         = var.aws_region
    dynamodb_table = aws_dynamodb_table.lock.name
    encrypt        = true
  }
}
