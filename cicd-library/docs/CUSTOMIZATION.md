# 🔧 Customizing the Library for Your Project

This guide explains how to customize the CI/CD library for your specific project without modifying the library itself.

## Quick Start (60 seconds)

```bash
# 1. Copy library terraform to your project root
cp -r cicd-library/terraform ./

# 2. Create your custom config
cat > terraform.tfvars << 'EOF'
project_name    = "my-awesome-ai"
environment     = "dev"
aws_region      = "us-east-1"
lambda_zip_path = "./backend/lambda-deployment.zip"
EOF

# 3. Deploy
cd terraform
terraform init
terraform plan -var-file=../terraform.tfvars
terraform apply -var-file=../terraform.tfvars
```

---

## Directory Structure

Your project should look like this:

```
my-ai-project/
├── backend/
│   ├── server.py
│   ├── context.py
│   ├── resources.py
│   ├── requirements.txt
│   ├── build.sh                    ← Script to build lambda.zip
│   └── lambda-deployment.zip       ← Built by build.sh
├── frontend/
│   ├── app/
│   ├── package.json
│   └── ...
├── cicd-library/                   ← Library (READ-ONLY)
│   └── terraform/
│       ├── main.tf
│       ├── variables.tf
│       ├── terraform.tfvars        ← Defaults only (don't edit)
│       └── terraform.tfvars.example ← Reference only (don't edit)
├── terraform/                      ← YOUR COPY
│   ├── main.tf
│   ├── variables.tf
│   └── (other .tf files)
├── terraform.tfvars                ← YOUR CUSTOMIZATION (this is new)
├── .gitignore
└── README.md
```

---

## Step 1: Set Up Your terraform.tfvars

### Option A: Simple (Most Users)

Create `terraform.tfvars` at your **project root** (not in terraform/ directory):

```bash
cat > terraform.tfvars << 'EOF'
# My Customization
project_name    = "my-awesome-ai"
environment     = "dev"
aws_region      = "us-east-1"
lambda_zip_path = "./backend/lambda-deployment.zip"
bedrock_model_id = "us.amazon.nova-2-lite-v1:0"
EOF
```

### Option B: Detailed (Copy from Example)

```bash
# Copy the example file to your project
cp terraform/terraform.tfvars.example terraform.tfvars

# Edit it with your values
nano terraform.tfvars
```

### Option C: No terraform.tfvars (Use Environment Variables)

```bash
export TF_VAR_project_name="my-awesome-ai"
export TF_VAR_lambda_zip_path="./backend/lambda-deployment.zip"
cd terraform
terraform plan
```

---

## Step 2: Configure Variables

### Required Variables

| Variable | Example | Notes |
|----------|---------|-------|
| `project_name` | `"my-awesome-ai"` | Prefix for all AWS resources |
| `lambda_zip_path` | `"./backend/lambda-deployment.zip"` | Path to your built Lambda ZIP |

### Optional Variables

| Variable | Default | Notes |
|----------|---------|-------|
| `environment` | `"dev"` | "dev", "staging", "prod" |
| `aws_region` | `"us-east-1"` | Your AWS region |
| `bedrock_model_id` | Nova Lite | AI model to use |
| `lambda_timeout` | 60 | Max execution time (seconds) |
| `api_throttle_burst_limit` | 10 | Max requests/sec (burst) |
| `api_throttle_rate_limit` | 5 | Max requests/sec (sustained) |
| `use_custom_domain` | false | Use custom domain with Route53 |
| `root_domain` | "" | Your domain (if using custom) |

---

## Step 3: Deploy

### First Deployment

```bash
# Initialize Terraform
cd terraform
terraform init

# See what will be created
terraform plan -var-file=../terraform.tfvars

# Create resources
terraform apply -var-file=../terraform.tfvars
```

### Updating Deployment

```bash
# Edit your terraform.tfvars
nano ../terraform.tfvars

# See changes
terraform plan -var-file=../terraform.tfvars

# Apply changes
terraform apply -var-file=../terraform.tfvars
```

---

## Common Customizations

### 1. Change Lambda Timeout

For slower AI responses, increase timeout:

```hcl
# terraform.tfvars
lambda_timeout = 120  # 2 minutes instead of 1
```

Then:
```bash
terraform apply -var-file=../terraform.tfvars
```

### 2. Use Different Bedrock Model

```hcl
# terraform.tfvars
# Use Claude 3 Opus (most capable, most expensive)
bedrock_model_id = "anthropic.claude-3-opus-20240229-v1:0"
```

### 3. Use Custom Domain

```hcl
# terraform.tfvars
use_custom_domain = true
root_domain       = "myai.com"
```

**Requirements:**
- Domain registered in Route53 in same AWS account
- Terraform will create ACM certificate automatically

### 4. Increase API Throttling

For higher traffic:

```hcl
# terraform.tfvars
api_throttle_burst_limit = 100  # Handle spikes
api_throttle_rate_limit  = 50   # Sustained rate
```

### 5. Change AWS Region

```hcl
# terraform.tfvars
aws_region = "eu-west-1"  # Europe instead of US-East
```

---

## Deploying Lambda ZIP Updates

When you update your backend code:

```bash
# 1. Build new Lambda zip
cd backend
./build.sh  # Creates/updates lambda-deployment.zip
cd ..

# 2. Update Lambda function in AWS
cd terraform
terraform apply -var-file=../terraform.tfvars
# Terraform will detect ZIP file change and redeploy Lambda
```

---

## Environment-Specific Configurations

For multiple environments (dev, staging, prod):

### Option 1: Separate tfvars Files

```bash
terraform.tfvars.dev
terraform.tfvars.staging
terraform.tfvars.prod
```

Deploy to dev:
```bash
cd terraform
terraform apply -var-file=../terraform.tfvars.dev
```

Deploy to prod:
```bash
cd terraform
terraform apply -var-file=../terraform.tfvars.prod
```

### Option 2: Environment Variables

```bash
#!/bin/bash
# Deploy to staging

export TF_VAR_project_name="my-awesome-ai"
export TF_VAR_environment="staging"
export TF_VAR_aws_region="us-east-1"
export TF_VAR_lambda_zip_path="./backend/lambda-deployment.zip"

cd terraform
terraform init
terraform plan
terraform apply -auto-approve
```

---

## Git Configuration

### Update .gitignore

```bash
# Ignore terraform files
terraform.tfvars          # Your custom config (secrets!)
*.tfvars                  # Any tfvars
!terraform.tfvars.example # Keep example

# Ignore terraform state
terraform/.terraform/
*.tfstate
*.tfstate.*
.terraform.lock.hcl

# Ignore build artifacts
backend/lambda-deployment.zip
backend/.venv/
```

### Keep Example, Ignore Custom

```bash
# DON'T commit your actual terraform.tfvars
git checkout .gitignore
echo "terraform.tfvars" >> .gitignore

# DO commit the example
git add terraform/terraform.tfvars.example
git commit -m "Add terraform configuration example"
```

---

## Troubleshooting

### Error: "terraform.tfvars not found"

```bash
# Wrong: Running from wrong directory
cd terraform
terraform plan

# Right: Specify the path
terraform plan -var-file=../terraform.tfvars
```

### Error: "lambda_zip_path file does not exist"

```bash
# Build the lambda ZIP first
cd backend
./build.sh

# Then try terraform again
cd ../terraform
terraform apply -var-file=../terraform.tfvars
```

### Error: "Invalid region"

Check your `aws_region` value:

```bash
# List available regions
aws ec2 describe-regions --query 'Regions[].RegionName'

# Update terraform.tfvars with valid region
sed -i.bak 's/aws_region.*/aws_region = "us-west-2"/' terraform.tfvars
```

---

## CI/CD Integration

For GitHub Actions or other CI/CD:

```yaml
# .github/workflows/deploy.yml
name: Deploy to AWS

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v2
        with:
          aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
          aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          aws-region: us-east-1

      - name: Build Lambda zip
        run: |
          cd backend
          ./build.sh

      - name: Deploy with Terraform
        env:
          TF_VAR_project_name: ${{ secrets.PROJECT_NAME }}
          TF_VAR_lambda_zip_path: ./backend/lambda-deployment.zip
          TF_VAR_environment: production
        run: |
          cd terraform
          terraform init
          terraform apply -auto-approve -var-file=../terraform.tfvars
```

---

## Summary

✅ **Create terraform.tfvars at project root** (not in terraform/ dir)
✅ **Set your project_name and lambda_zip_path**
✅ **Use -var-file=../terraform.tfvars when running terraform**
✅ **Don't commit terraform.tfvars to git**
✅ **Keep terraform.tfvars.example for reference**

That's it! You've customized the library for your project. 🎉

