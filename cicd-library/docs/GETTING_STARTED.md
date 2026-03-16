# Getting Started with AI Twin CI/CD Library

## Prerequisites

Before you begin, ensure you have:
- ✅ AWS Account with appropriate permissions
- ✅ GitHub repository
- ✅ Terraform v1.14+ installed
- ✅ AWS CLI configured with credentials
- ✅ Python 3.11+ (for backend)
- ✅ Node.js 18+ (for frontend)

## 5-Minute Quick Start

### 1. Initialize Your Project

```bash
# From your project directory
cd your-project

# Copy library structure (or use as submodule)
cp -r cicd-library/* ./

# Or add as submodule
git submodule add https://github.com/YOUR_USERNAME/ai-twin-cicd-lib.git cicd-lib
```

### 2. Configure Variables

Create `terraform.tfvars`:

```hcl
project_name      = "my-ai-twin"
environment       = "dev"
bedrock_model_id  = "us.amazon.nova-2-lite-v1:0"
root_domain       = ""  # Leave empty for now
use_custom_domain = false
aws_region        = "us-east-1"
```

### 3. Deploy Infrastructure

```bash
cd terraform

# Initialize Terraform
terraform init

# Preview changes
terraform plan

# Deploy to AWS
terraform apply
```

### 4. Set Up GitHub Actions (Optional)

```bash
# Copy workflows to your GitHub repo
mkdir -p .github/workflows
cp cicd-library/github-workflows/*.yml .github/workflows/

# Add to git
git add .github/workflows/
git commit -m "Add CI/CD workflows from library"

# Configure GitHub secrets:
# Settings → Secrets → New repository secret
# - AWS_ROLE_ARN
# - AWS_REGION
```

## Local Development

### Start Everything Locally

```bash
# From project root
./cicd-library/scripts/local-dev.sh

# This will:
# 1. Start backend on http://localhost:8000
# 2. Start frontend on http://localhost:3000
# 3. Create .env files with defaults
```

### Test Endpoints

```bash
./cicd-library/scripts/test-local.sh

# Tests:
# - GET http://localhost:8000/health
# - GET http://localhost:8000/
# - POST http://localhost:8000/chat
# - GET http://localhost:3000
```

## Full Deployment Guide

### Step 1: Prepare Your Backend

```bash
# Copy your backend code
cd backend

# Create virtual environment
python -m venv .venv
source .venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Create .env file
cat > .env << 'EOF'
DEFAULT_AWS_REGION=us-east-1
BEDROCK_MODEL_ID=us.amazon.nova-2-lite-v1:0
CORS_ORIGINS=http://localhost:3000
USE_S3=true
S3_BUCKET=your-bucket-name-from-terraform
MEMORY_DIR=../memory
EOF
```

### Step 2: Prepare Your Frontend

```bash
cd frontend

# Install dependencies
npm install

# Create .env.local
cat > .env.local << 'EOF'
NEXT_PUBLIC_API_URL=http://localhost:8000
EOF

# For production, update to your API Gateway URL after deployment
```

### Step 3: Create terraform.tfvars

```hcl
# terraform.tfvars
project_name       = "my-ai-twin"
environment        = "dev"
bedrock_model_id   = "us.amazon.nova-2-lite-v1:0"
root_domain        = "example.com"  # Your domain (optional)
use_custom_domain  = false           # Set to true if using custom domain
aws_region         = "us-east-1"
```

### Step 4: Initialize Terraform

```bash
cd terraform

# Download providers and modules
terraform init

# Check configuration
terraform fmt -recursive

# Validate syntax
terraform validate
```

### Step 5: Plan Deployment

```bash
# See what Terraform will create
terraform plan -out=tfplan

# Review the plan carefully
# Should show ~15-20 resources being created
```

### Step 6: Apply Configuration

```bash
# Deploy to AWS
terraform apply tfplan

# Terraform will:
# 1. Create S3 buckets
# 2. Create Lambda function
# 3. Create API Gateway
# 4. Create CloudFront distribution
# 5. Configure IAM roles
```

### Step 7: Get Outputs

```bash
# After successful apply, get important values:
terraform output

# You'll get:
# - api_gateway_url
# - cloudfront_domain
# - frontend_bucket_name
# - memory_bucket_name
```

## GitHub Actions Setup

### Add Deployment Secrets

1. Go to GitHub repo → Settings → Secrets and variables → Actions
2. Click "New repository secret"
3. Add these secrets:

```
AWS_ROLE_ARN: arn:aws:iam::ACCOUNT_ID:role/github-oidc-role
AWS_REGION: us-east-1
```

### Verify Workflow

```bash
# Push changes to main branch
git add .
git commit -m "Configure CI/CD"
git push origin main

# Check Actions tab in GitHub
# Should see workflow running
```

## Verify Deployment

### Test API Gateway

```bash
# Get API Gateway URL from terraform output
API_URL=$(terraform output -raw api_gateway_url)

# Test health endpoint
curl $API_URL/health

# Expected response:
# {"status": "healthy", "use_s3": true, "bedrock_model": "us.amazon.nova-2-lite-v1:0"}
```

### Test Frontend

```bash
# Get CloudFront domain
terraform output -raw cloudfront_domain

# Open in browser or curl
curl https://your-cloudfront-domain.cloudfront.net
```

### Test Chat Endpoint

```bash
API_URL=$(terraform output -raw api_gateway_url)

curl -X POST $API_URL/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "Hello!", "session_id": "test-1"}'
```

## Troubleshooting

### Terraform State Lock Error

```bash
# If you get "Error acquiring the state lock"
terraform force-unlock LOCK_ID

# Replace LOCK_ID with the ID from error message
```

### Lambda Deployment Fails

```bash
# Check Lambda logs
aws logs tail /aws/lambda/my-ai-twin-dev-backend --follow

# Verify environment variables
aws lambda get-function-configuration --function-name my-ai-twin-dev-backend
```

### Frontend Not Updating

```bash
# Invalidate CloudFront cache
aws cloudfront create-invalidation \
  --distribution-id YOUR_DIST_ID \
  --paths "/*"
```

## Next Steps

1. **Customize for Your Brand**
   - Update frontend styling
   - Add your data files to `backend/data/`
   - Update AI prompts in `backend/context.py`

2. **Configure Custom Domain** (Optional)
   - Set `use_custom_domain = true` in terraform.tfvars
   - Update `root_domain` with your domain
   - Run `terraform apply` again

3. **Set Up Monitoring**
   - Enable CloudWatch logs
   - Create cost alerts
   - Set up performance monitoring

4. **Production Readiness**
   - Use separate state files for dev/prod
   - Enable backups for S3
   - Configure auto-scaling
   - Add SSL/TLS certificates

## Common Tasks

### Update Application Code

```bash
# Make changes to backend/frontend
git add .
git commit -m "Update application"
git push origin main

# GitHub Actions will automatically:
# 1. Build Lambda function
# 2. Deploy new version
# 3. Update frontend on S3
# 4. Invalidate cache
```

### Scale Resources

```bash
# Edit terraform.tfvars
# Update Lambda memory, timeout, etc.

terraform plan
terraform apply
```

### Destroy Everything

```bash
# WARNING: This deletes all resources!
./scripts/destroy.sh

# Or manually:
cd terraform
terraform destroy
```

## Getting Help

- Check [TROUBLESHOOTING.md](TROUBLESHOOTING.md) for common issues
- Review [INTEGRATION_GUIDE.md](INTEGRATION_GUIDE.md) for advanced setup
- Check Terraform documentation: https://www.terraform.io/docs
- Check AWS documentation: https://docs.aws.amazon.com

## Next: Integration Guide

Once you've completed this quick start, see [INTEGRATION_GUIDE.md](INTEGRATION_GUIDE.md) for:
- Advanced configurations
- Multi-environment setup
- Cost optimization
- Performance tuning
