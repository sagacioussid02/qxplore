# Library Usage Patterns for Variables & Deployment Zips

This guide explains how users can safely override `terraform.tfvars` and specify their own Lambda deployment zip file paths without modifying the library.

## Overview

The library provides **3 flexible patterns** for users to customize their deployment:

1. **Pattern 1: External terraform.tfvars** (Recommended)
2. **Pattern 2: Environment variables override**
3. **Pattern 3: Command-line variables**

---

## Pattern 1: External terraform.tfvars (Recommended ⭐)

### For Users of This Library

Users should **NEVER edit** files inside the `cicd-library/` folder. Instead, create their own `terraform.tfvars` at the root of their project.

### Directory Structure

```
your-ai-twin-project/
├── backend/
│   ├── lambda-deployment.zip    ← User builds this
│   └── ...
├── frontend/
│   └── ...
├── cicd-library/                ← Library (READ-ONLY)
│   └── terraform/
│       ├── main.tf
│       ├── variables.tf
│       └── terraform.tfvars     ← DEFAULT VALUES ONLY
├── terraform/                   ← USER'S CUSTOM LOCATION
│   └── terraform.tfvars         ← USER'S OVERRIDE
└── .gitignore
```

### Step-by-Step Setup

**Step 1: Copy library to your project**

```bash
cp -r cicd-library/terraform /path/to/your/project/
```

**Step 2: Create your custom terraform.tfvars**

```bash
cd /path/to/your/project

# Create your own tfvars file in the root
cat > terraform.tfvars << 'EOF'
# My Project Configuration
project_name     = "my-ai-twin"
environment      = "production"
aws_region       = "us-west-2"
lambda_zip_path  = "./backend/lambda-deployment.zip"
bedrock_model_id = "us.amazon.nova-2-lite-v1:0"

# Optional customizations
lambda_timeout           = 120
api_throttle_burst_limit = 20
api_throttle_rate_limit  = 10

# Optional: Custom domain
use_custom_domain = true
root_domain       = "myaidomain.com"
EOF
```

**Step 3: Deploy using your custom config**

```bash
cd /path/to/your/project

# Initialize terraform (points to cicd-library/terraform)
terraform -chdir=./terraform init

# Plan using YOUR custom tfvars (from parent directory)
terraform -chdir=./terraform plan -var-file=../terraform.tfvars

# Apply
terraform -chdir=./terraform apply -var-file=../terraform.tfvars
```

### Key Points for Pattern 1

✅ **Your `terraform.tfvars` lives OUTSIDE the library**
✅ **Library terraform.tfvars has default values only**
✅ **Your override always takes precedence**
✅ **Git ignore your personal tfvars**
✅ **No library modifications needed**

### Example: .gitignore

```
# Ignore personal terraform overrides
terraform.tfvars
*.tfvars
!terraform.tfvars.example

# Ignore Terraform state
*.tfstate
*.tfstate.*
.terraform/
```

---

## Pattern 2: Environment Variables Override

Users can override individual variables using environment variables.

### Setup

```bash
# Set environment variables before terraform
export TF_VAR_project_name="my-ai-twin"
export TF_VAR_environment="dev"
export TF_VAR_aws_region="us-east-1"
export TF_VAR_lambda_zip_path="./backend/lambda-deployment.zip"
export TF_VAR_bedrock_model_id="us.amazon.nova-2-lite-v1:0"

# Now run terraform
cd terraform
terraform init
terraform plan
terraform apply
```

### Full Example Script

```bash
#!/bin/bash
# setup-env.sh

# Set your custom variables
export TF_VAR_project_name="my-ai-twin"
export TF_VAR_environment="production"
export TF_VAR_aws_region="us-west-2"
export TF_VAR_lambda_zip_path="$(pwd)/backend/lambda-deployment.zip"
export TF_VAR_bedrock_model_id="us.amazon.nova-2-lite-v1:0"
export TF_VAR_lambda_timeout="120"

# Run terraform
cd terraform
terraform init
terraform plan
terraform apply
```

Then use it:

```bash
source setup-env.sh
cd terraform
terraform plan
terraform apply
```

### Key Points for Pattern 2

✅ **No files need modification**
✅ **Good for CI/CD pipelines**
✅ **Environment-specific configuration**
✅ **Works in GitHub Actions**

---

## Pattern 3: Command-Line Variables

Users can pass variables directly on the command line.

```bash
cd terraform

terraform init

# Single variable
terraform plan \
  -var="project_name=my-ai-twin" \
  -var="lambda_zip_path=../backend/lambda-deployment.zip"

# Multiple variables
terraform apply \
  -var="project_name=my-ai-twin" \
  -var="environment=production" \
  -var="aws_region=us-west-2" \
  -var="lambda_zip_path=../backend/lambda-deployment.zip" \
  -var="bedrock_model_id=us.amazon.nova-2-lite-v1:0"
```

### Using a Script

```bash
#!/bin/bash
# deploy.sh

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

cd "$SCRIPT_DIR/terraform"

terraform init

terraform apply \
  -var="project_name=my-ai-twin" \
  -var="environment=production" \
  -var="aws_region=us-west-2" \
  -var="lambda_zip_path=$PROJECT_ROOT/backend/lambda-deployment.zip" \
  -var="bedrock_model_id=us.amazon.nova-2-lite-v1:0" \
  -auto-approve
```

### Key Points for Pattern 3

✅ **Great for CI/CD (GitHub Actions, Jenkins)**
✅ **No files to maintain**
✅ **Secrets-friendly (no files stored in repo)**
✅ **Easy to template**

---

## Lambda ZIP Path: Best Practices

### Relative Paths (Recommended)

Users should use **relative paths** from the Terraform working directory:

```hcl
# Bad: absolute paths (breaks for other users)
lambda_zip_path = "/Users/sidd/workspace/AI/twin/backend/lambda-deployment.zip"

# Good: relative paths (works for everyone)
lambda_zip_path = "../backend/lambda-deployment.zip"

# Also good: from project root
lambda_zip_path = "./backend/lambda-deployment.zip"
```

### Dynamic Paths in Scripts

```bash
#!/bin/bash
# setup.sh

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
LAMBDA_ZIP="$PROJECT_ROOT/backend/lambda-deployment.zip"

# Verify zip exists
if [ ! -f "$LAMBDA_ZIP" ]; then
  echo "Error: Lambda ZIP not found at $LAMBDA_ZIP"
  echo "Please build it first: cd $PROJECT_ROOT/backend && ./build-lambda.sh"
  exit 1
fi

# Use in terraform
cd "$SCRIPT_DIR/terraform"
terraform init
terraform apply -var="lambda_zip_path=$LAMBDA_ZIP"
```

---

## For Library Maintainers

To ensure your library is flexible, follow these practices:

### 1. Use terraform.tfvars as DEFAULTS only

```hcl
# terraform.tfvars (library/terraform/terraform.tfvars)
# These are DEFAULT values that users can override

project_name     = "changeme"      # User must override
environment      = "dev"           # Default, user can override
aws_region       = "us-east-1"     # Default, user can override
lambda_zip_path  = "./lambda.zip"  # Placeholder, user MUST override
bedrock_model_id = "..." # Default Bedrock model
```

### 2. Create a .example file for reference

```bash
# terraform/terraform.tfvars.example (READ ONLY)
# This is a template showing all available variables

# Copy this file and customize for your project
# DO NOT edit this file - it's for reference only
# Instead, create your own terraform.tfvars at project root

project_name     = "your-project-name"    # REQUIRED: Change this
environment      = "dev"                   # dev, test, prod
aws_region       = "us-east-1"            # Your AWS region
lambda_zip_path  = "./backend/lambda-deployment.zip"  # Path to your zip
bedrock_model_id = "us.amazon.nova-2-lite-v1:0"     # Your Bedrock model

# Optional settings
lambda_timeout           = 60      # Lambda timeout in seconds
api_throttle_burst_limit = 10      # API Gateway burst
api_throttle_rate_limit  = 5       # API Gateway rate limit

# Optional: Custom domain
use_custom_domain = false
root_domain       = ""
```

### 3. Add clear documentation

Include in README:

```markdown
## Configuration

You have 3 ways to customize your deployment:

### Option 1: Create terraform.tfvars (Recommended)

```bash
cp terraform/terraform.tfvars.example terraform.tfvars
# Edit your terraform.tfvars at project root
terraform -chdir=./terraform plan -var-file=../terraform.tfvars
```

### Option 2: Environment variables

```bash
export TF_VAR_project_name="your-project"
export TF_VAR_lambda_zip_path="./backend/lambda.zip"
terraform -chdir=./terraform plan
```

### Option 3: Command line

```bash
terraform -chdir=./terraform plan \
  -var="project_name=your-project" \
  -var="lambda_zip_path=./backend/lambda.zip"
```
```

### 4. Document all variables

In `variables.tf`, use clear descriptions:

```hcl
variable "lambda_zip_path" {
  description = "Absolute or relative path to Lambda deployment ZIP file. Can be relative to terraform/ directory or absolute path."
  type        = string
  # Note: User MUST override this in their terraform.tfvars
}

variable "project_name" {
  description = "Name of your project (lowercase, alphanumeric, hyphens allowed). Used as prefix for all AWS resources."
  type        = string
  # Example: "my-ai-twin", "awesome-bot"
}
```

---

## Real-World Example: User Setup

### User's Directory Structure

```
my-awesome-ai-project/
├── backend/
│   ├── main.py
│   ├── requirements.txt
│   └── lambda-deployment.zip     ← Built by user
├── frontend/
│   ├── app.tsx
│   └── package.json
├── cicd-library/                 ← Cloned/copied from repo (READ-ONLY)
│   └── terraform/
│       ├── main.tf
│       ├── variables.tf
│       └── terraform.tfvars      ← Defaults only
├── terraform/                    ← User creates this
│   └── terraform.tfvars          ← User customizes this
├── terraform.tfvars              ← OR here (root level)
└── .gitignore
```

### User's terraform.tfvars

```hcl
# My Custom Configuration
# Created: 2026-03-03

project_name     = "awesome-ai-bot"
environment      = "production"
aws_region       = "us-west-2"

# Path to lambda deployment zip (relative or absolute)
lambda_zip_path = "./backend/lambda-deployment.zip"

# Your Bedrock model
bedrock_model_id = "us.amazon.nova-2-lite-v1:0"

# Custom domain
use_custom_domain = true
root_domain       = "awesomai.com"

# Performance tuning
lambda_timeout           = 120
api_throttle_burst_limit = 20
api_throttle_rate_limit  = 15
```

### User's Deployment Command

```bash
# Build lambda zip
cd backend
./build.sh
cd ..

# Deploy
cd terraform
terraform init
terraform plan -var-file=../terraform.tfvars
terraform apply -var-file=../terraform.tfvars
```

---

## Summary

| Pattern | Best For | Difficulty |
|---------|----------|-----------|
| External terraform.tfvars | Most users, local dev | ⭐ Easy |
| Environment variables | CI/CD pipelines, docker | ⭐⭐ Medium |
| Command-line vars | Scripts, one-time deploys | ⭐⭐ Medium |

**Recommendation**: Use Pattern 1 (External terraform.tfvars) for users. It's the most intuitive and maintainable.

---

## Checklist for Library Users

- [ ] Copy `cicd-library/terraform/` to your project
- [ ] Create `terraform.tfvars` with your custom values
- [ ] Update `lambda_zip_path` to your actual zip file location
- [ ] Add `terraform.tfvars` to `.gitignore`
- [ ] Run `terraform -chdir=./terraform init`
- [ ] Run `terraform -chdir=./terraform plan -var-file=../terraform.tfvars`
- [ ] Review planned resources
- [ ] Run `terraform -chdir=./terraform apply -var-file=../terraform.tfvars`

