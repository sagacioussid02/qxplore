# Integration Guide - Using AI Twin CI/CD Library in Your Projects

This guide explains how to use the AI Twin CI/CD Library in new and existing projects.

## Integration Options

### Option 1: Submodule (Recommended for Teams)

**Best for:** Teams, shared repositories, keeping up with library updates

```bash
cd your-project
git submodule add https://github.com/YOUR_USERNAME/ai-twin-cicd-lib.git cicd-lib

# Initialize submodule
git submodule update --init --recursive

# Your structure becomes:
your-project/
├── backend/
├── frontend/
├── cicd-lib/              # Points to library repo
│   ├── terraform/
│   ├── github-workflows/
│   └── scripts/
├── .github/workflows/     # Copy from cicd-lib/github-workflows/
└── terraform.tfvars       # Your configuration
```

### Option 2: Copy & Customize (Best for Customization)

**Best for:** Independent projects, custom modifications

```bash
cd your-project

# Copy entire library
cp -r cicd-library/* ./

# Your structure becomes:
your-project/
├── backend/
├── frontend/
├── terraform/            # Copied from library
├── github-workflows/     # Copied from library
└── scripts/              # Copied from library
```

### Option 3: Terraform Modules Only (Advanced)

**Best for:** Just needing the Terraform code

```hcl
# In your terraform/main.tf
module "storage" {
  source = "git::https://github.com/YOUR_USERNAME/ai-twin-cicd-lib.git//terraform/modules/storage"
  
  name_prefix = "${var.project_name}-${var.environment}"
  common_tags = local.common_tags
}

module "compute" {
  source = "git::https://github.com/YOUR_USERNAME/ai-twin-cicd-lib.git//terraform/modules/compute"
  
  function_name = "${var.project_name}-${var.environment}-backend"
  # ... more variables
}
```

## Project Setup for Each Option

### Using Submodule

#### Step 1: Add Submodule

```bash
git submodule add https://github.com/YOUR_USERNAME/ai-twin-cicd-lib.git cicd-lib
```

#### Step 2: Copy Workflows

```bash
mkdir -p .github/workflows
cp cicd-lib/github-workflows/*.yml .github/workflows/

# Update workflow paths if needed
# Change: cicd/scripts/ → cicd-lib/scripts/
# Change: cicd/terraform/ → cicd-lib/terraform/
```

#### Step 3: Create terraform.tfvars

```hcl
# terraform.tfvars
project_name      = "new-project"
environment       = "dev"
bedrock_model_id  = "us.amazon.nova-2-lite-v1:0"
root_domain       = ""
use_custom_domain = false
aws_region        = "us-east-1"
```

#### Step 4: Initialize & Deploy

```bash
cd cicd-lib/terraform
terraform init
terraform plan
terraform apply
```

#### Step 5: Update Workflows for Submodule

Edit `.github/workflows/deploy.yml`:

```yaml
- name: Deploy Infrastructure
  run: ./cicd-lib/scripts/deploy.sh
  # (instead of ./cicd/scripts/deploy.sh)
```

### Using Copy & Customize

#### Step 1: Copy Library

```bash
cp -r ../ai-twin-cicd-library/{terraform,scripts,github-workflows} ./

# Verify structure
ls terraform/
ls scripts/
ls github-workflows/
```

#### Step 2: Create Configuration

```hcl
# terraform.tfvars
project_name      = "another-project"
environment       = "dev"
bedrock_model_id  = "us.amazon.nova-2-lite-v1:0"
root_domain       = "myproject.com"
use_custom_domain = true
aws_region        = "us-east-1"
```

#### Step 3: Customize Files

```bash
# Edit terraform files for project-specific needs
vim terraform/main.tf
vim terraform/variables.tf

# Customize scripts if needed
vim scripts/deploy.sh
```

#### Step 4: Set Up GitHub Actions

```bash
cp github-workflows/*.yml .github/workflows/
```

#### Step 5: Deploy

```bash
cd terraform
terraform init
terraform apply
```

### Using Terraform Modules Only

#### Step 1: Create Terraform Project

```bash
mkdir terraform
cd terraform
cat > main.tf << 'EOF'
terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = var.aws_region
}

module "storage" {
  source = "git::https://github.com/YOUR_USERNAME/ai-twin-cicd-lib.git//terraform/modules/storage"
  
  name_prefix = "${var.project_name}-${var.environment}"
  common_tags = local.common_tags
}

module "compute" {
  source = "git::https://github.com/YOUR_USERNAME/ai-twin-cicd-lib.git//terraform/modules/compute"
  
  function_name       = "${var.project_name}-${var.environment}-backend"
  lambda_handler_file = "${path.module}/../backend/lambda_handler.py"
  # ... more config
}

module "cdn" {
  source = "git::https://github.com/YOUR_USERNAME/ai-twin-cicd-lib.git//terraform/modules/cdn"
  
  distribution_name = "${var.project_name}-${var.environment}"
  # ... more config
}
EOF
```

#### Step 2: Create variables.tf

```hcl
variable "project_name" {
  type = string
}

variable "environment" {
  type = string
}

variable "aws_region" {
  type = string
}

# ... more variables
```

#### Step 3: Create terraform.tfvars

```hcl
project_name = "custom-project"
environment  = "dev"
aws_region   = "us-east-1"
```

#### Step 4: Deploy

```bash
terraform init
terraform apply
```

## Multi-Environment Setup

### Directory Structure for Multiple Environments

```
your-project/
├── backend/
├── frontend/
├── terraform/
│   ├── main.tf
│   ├── variables.tf
│   ├── versions.tf
│   └── modules/          # From library
│       ├── storage/
│       ├── compute/
│       └── cdn/
├── envs/
│   ├── dev/
│   │   └── terraform.tfvars
│   ├── staging/
│   │   └── terraform.tfvars
│   └── prod/
│       └── terraform.tfvars
└── .github/workflows/
    ├── deploy-dev.yml
    ├── deploy-prod.yml
    └── destroy.yml
```

### Using terraform.tfvars for Each Environment

```bash
# Development
terraform apply -var-file=envs/dev/terraform.tfvars

# Staging
terraform apply -var-file=envs/staging/terraform.tfvars

# Production
terraform apply -var-file=envs/prod/terraform.tfvars
```

### GitHub Actions for Multi-Environment

```yaml
# .github/workflows/deploy-dev.yml
name: Deploy Dev

on:
  push:
    branches: [dev]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: hashicorp/setup-terraform@v2
      
      - name: Terraform Init
        run: cd terraform && terraform init
      
      - name: Terraform Apply (Dev)
        run: cd terraform && terraform apply -var-file=../envs/dev/terraform.tfvars -auto-approve
```

## Version Management

### Pinning Library Version (Submodule)

```bash
# Use specific tag/version
git submodule add -b v1.0.0 https://github.com/YOUR_USERNAME/ai-twin-cicd-lib.git cicd-lib

# Update to new version
cd cicd-lib
git checkout v1.1.0
cd ..
git add cicd-lib
git commit -m "Update CI/CD library to v1.1.0"
```

### Terraform Module Version

```hcl
module "storage" {
  source = "git::https://github.com/YOUR_USERNAME/ai-twin-cicd-lib.git//terraform/modules/storage?ref=v1.0.0"
  
  # Uses specific version
}
```

## Customization Examples

### Custom Lambda Environment Variables

```hcl
# terraform/main.tf
module "compute" {
  source = "./modules/compute"
  
  function_name = "my-backend"
  
  environment_variables = {
    CUSTOM_VAR = "custom-value"
    API_KEY    = var.api_key
  }
}
```

### Custom Domain with ACM

```hcl
# terraform/main.tf
module "cdn" {
  source = "./modules/cdn"
  
  use_custom_domain    = var.use_custom_domain
  root_domain          = var.root_domain
  acm_certificate_arn  = aws_acm_certificate.main.arn
}
```

### Custom S3 Lifecycle Policy

```hcl
# terraform/main.tf
resource "aws_s3_bucket_lifecycle_configuration" "memory" {
  bucket = module.storage.memory_bucket_id
  
  rule {
    id     = "archive-old-conversations"
    status = "Enabled"
    
    transition {
      days          = 30
      storage_class = "GLACIER"
    }
    
    expiration {
      days = 365
    }
  }
}
```

## Troubleshooting Integration

### Submodule Not Updating

```bash
# Update submodule to latest
git submodule update --remote

# Or specific branch/tag
git submodule set-branch --branch main cicd-lib
git submodule update --remote
```

### Terraform Module Source Error

```bash
# Clear Terraform cache
rm -rf .terraform/modules

# Reinitialize
terraform init
```

### Workflow Path Issues

```bash
# If using submodule, verify paths in workflows
# Should reference: cicd-lib/scripts/
# Not: cicd/scripts/

grep -n "cicd/" .github/workflows/*.yml
sed -i 's|cicd/|cicd-lib/|g' .github/workflows/*.yml
```

## Updating to New Library Versions

### For Submodule Users

```bash
# Update to latest
git submodule update --remote

# Or specific tag
git -C cicd-lib checkout v1.1.0

# Commit changes
git add cicd-lib
git commit -m "Update CI/CD library to v1.1.0"
git push
```

### For Copy Users

```bash
# Compare with latest library
diff -r terraform/ ../ai-twin-cicd-lib/terraform/

# Update specific files
cp -u ../ai-twin-cicd-lib/terraform/*.tf terraform/

# Test before committing
terraform validate
```

## Next Steps

1. **Choose Integration Option** - Pick the best approach for your workflow
2. **Follow Quick Start** - See [GETTING_STARTED.md](GETTING_STARTED.md)
3. **Customize Configuration** - Adjust terraform.tfvars for your needs
4. **Deploy** - Run terraform apply to create infrastructure
5. **Monitor** - Set up CloudWatch and cost alerts
6. **Iterate** - Make changes and push to GitHub (Actions auto-deploy)

## Support

- See [TROUBLESHOOTING.md](TROUBLESHOOTING.md) for common issues
- Check AWS documentation for provider-specific questions
- Review Terraform docs: https://www.terraform.io/docs
