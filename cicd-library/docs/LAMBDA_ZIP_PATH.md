# Lambda ZIP Path Configuration Guide

This guide explains how to configure the `lambda_zip_path` variable for different project structures and deployment scenarios.

## Overview

The `lambda_zip_path` tells Terraform where to find your built Lambda function deployment ZIP file. It's flexible and supports multiple path formats and locations.

---

## Path Formats

### Relative Paths (Recommended)

Relative paths are resolved from the `terraform/` working directory:

#### From terraform/ to backend/

```hcl
# If your structure is:
# project/
#   ├── terraform/
#   └── backend/lambda-deployment.zip

# Use in terraform.tfvars:
lambda_zip_path = "../backend/lambda-deployment.zip"
```

#### From project root

If users place `terraform.tfvars` at project root:

```hcl
# terraform.tfvars at project root:
lambda_zip_path = "./backend/lambda-deployment.zip"

# Run with:
# cd terraform && terraform plan -var-file=../terraform.tfvars
```

#### With build directory

```hcl
# If ZIP is in a build/ folder:
lambda_zip_path = "../build/lambda-deployment.zip"

# If ZIP is in dist/:
lambda_zip_path = "../dist/lambda.zip"
```

### Absolute Paths

For CI/CD pipelines or specific use cases:

```hcl
# Absolute path (Linux/Mac)
lambda_zip_path = "/home/user/projects/my-ai/backend/lambda-deployment.zip"

# Absolute path (Windows)
lambda_zip_path = "C:\\Users\\user\\projects\\my-ai\\backend\\lambda-deployment.zip"

# But AVOID in version control (too specific to one machine)
```

---

## Common Project Structures

### Structure 1: Backend in separate folder (Most Common)

```
my-ai-project/
├── backend/
│   ├── main.py
│   ├── requirements.txt
│   ├── build.sh
│   └── lambda-deployment.zip
├── frontend/
│   └── ...
├── terraform/
│   ├── main.tf
│   └── ...
└── terraform.tfvars
```

**Configuration:**
```hcl
# terraform.tfvars (at project root)
lambda_zip_path = "./backend/lambda-deployment.zip"

# Run:
# cd terraform && terraform plan -var-file=../terraform.tfvars
```

### Structure 2: Monorepo with build output

```
monorepo/
├── services/
│   └── ai-twin/
│       ├── backend/
│       │   └── src/
│       ├── frontend/
│       │   └── src/
│       └── build/
│           └── lambda-deployment.zip
├── terraform/
│   └── ...
└── terraform.tfvars
```

**Configuration:**
```hcl
# terraform.tfvars
lambda_zip_path = "./services/ai-twin/build/lambda-deployment.zip"
```

### Structure 3: Dist folder for deployments

```
my-ai/
├── src/
│   ├── backend/
│   └── frontend/
├── dist/
│   ├── lambda-deployment.zip
│   └── frontend-build/
├── terraform/
│   └── ...
└── terraform.tfvars
```

**Configuration:**
```hcl
# terraform.tfvars
lambda_zip_path = "./dist/lambda-deployment.zip"
```

### Structure 4: Inside terraform directory

```
my-ai/
├── backend/
│   └── src/
├── frontend/
│   └── src/
└── terraform/
    ├── main.tf
    ├── variables.tf
    ├── terraform.tfvars
    └── build/
        └── lambda-deployment.zip
```

**Configuration:**
```hcl
# terraform.tfvars (inside terraform/)
lambda_zip_path = "./build/lambda-deployment.zip"

# Run:
# cd terraform && terraform plan
```

---

## Dynamic Paths in Scripts

### Shell Script with Auto-Detection

```bash
#!/bin/bash
# deploy.sh - Automatically handles different project structures

# Get script directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

# Try multiple possible locations
if [ -f "$PROJECT_ROOT/backend/lambda-deployment.zip" ]; then
    LAMBDA_ZIP="$PROJECT_ROOT/backend/lambda-deployment.zip"
elif [ -f "$PROJECT_ROOT/build/lambda-deployment.zip" ]; then
    LAMBDA_ZIP="$PROJECT_ROOT/build/lambda-deployment.zip"
elif [ -f "$PROJECT_ROOT/dist/lambda-deployment.zip" ]; then
    LAMBDA_ZIP="$PROJECT_ROOT/dist/lambda-deployment.zip"
else
    echo "Error: lambda-deployment.zip not found in expected locations"
    echo "Checked:"
    echo "  - $PROJECT_ROOT/backend/lambda-deployment.zip"
    echo "  - $PROJECT_ROOT/build/lambda-deployment.zip"
    echo "  - $PROJECT_ROOT/dist/lambda-deployment.zip"
    exit 1
fi

# Use relative path from terraform/
RELATIVE_PATH=$(python3 -c "import os.path; print(os.path.relpath('$LAMBDA_ZIP', '$SCRIPT_DIR/terraform'))")

echo "Using Lambda ZIP: $RELATIVE_PATH"

# Deploy
cd "$SCRIPT_DIR/terraform"
terraform init
terraform apply -var="lambda_zip_path=$RELATIVE_PATH"
```

### Python Script with Path Calculation

```python
#!/usr/bin/env python3
# deploy.py

import os
import sys
import subprocess
from pathlib import Path

def find_lambda_zip(project_root):
    """Find lambda-deployment.zip in common locations."""
    candidates = [
        "backend/lambda-deployment.zip",
        "build/lambda-deployment.zip",
        "dist/lambda-deployment.zip",
        "terraform/build/lambda-deployment.zip",
    ]
    
    for candidate in candidates:
        path = project_root / candidate
        if path.exists():
            return path
    
    raise FileNotFoundError(f"lambda-deployment.zip not found in {project_root}")

def main():
    # Get paths
    script_dir = Path(__file__).parent
    project_root = script_dir.parent
    terraform_dir = script_dir / "terraform"
    
    # Find lambda ZIP
    lambda_zip = find_lambda_zip(project_root)
    
    # Calculate relative path from terraform directory
    relative_path = os.path.relpath(lambda_zip, terraform_dir)
    
    print(f"Found Lambda ZIP: {lambda_zip}")
    print(f"Relative path: {relative_path}")
    
    # Deploy
    os.chdir(terraform_dir)
    subprocess.run([
        "terraform", "init"
    ], check=True)
    
    subprocess.run([
        "terraform", "apply",
        "-var", f"lambda_zip_path={relative_path}"
    ], check=True)

if __name__ == "__main__":
    main()
```

---

## CI/CD Integration

### GitHub Actions

```yaml
# .github/workflows/deploy.yml

name: Deploy
on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Build Lambda package
        run: |
          cd backend
          pip install -r requirements.txt -t build/
          cd build
          zip -r ../lambda-deployment.zip .
          cd ../..
      
      - name: Get ZIP path
        id: zip-path
        run: |
          # Calculate relative path
          ZIP_PATH="./backend/lambda-deployment.zip"
          echo "path=$ZIP_PATH" >> $GITHUB_OUTPUT
      
      - name: Deploy with Terraform
        env:
          TF_VAR_project_name: ${{ secrets.PROJECT_NAME }}
          TF_VAR_lambda_zip_path: ${{ steps.zip-path.outputs.path }}
        run: |
          cd terraform
          terraform init
          terraform apply -auto-approve
```

### GitLab CI

```yaml
# .gitlab-ci.yml

stages:
  - build
  - deploy

build-lambda:
  stage: build
  script:
    - cd backend
    - pip install -r requirements.txt -t build/
    - cd build && zip -r ../lambda-deployment.zip . && cd ../..
  artifacts:
    paths:
      - backend/lambda-deployment.zip
    expire_in: 1 day

deploy:
  stage: deploy
  script:
    - cd terraform
    - terraform init
    - terraform apply 
        -var="project_name=$PROJECT_NAME" 
        -var="lambda_zip_path=../backend/lambda-deployment.zip" 
        -auto-approve
  dependencies:
    - build-lambda
```

### Jenkins

```groovy
// Jenkinsfile

pipeline {
    agent any
    
    environment {
        AWS_REGION = 'us-east-1'
        LAMBDA_ZIP = './backend/lambda-deployment.zip'
    }
    
    stages {
        stage('Build Lambda') {
            steps {
                sh '''
                    cd backend
                    pip install -r requirements.txt -t build/
                    cd build
                    zip -r ../lambda-deployment.zip .
                '''
            }
        }
        
        stage('Deploy') {
            steps {
                sh '''
                    cd terraform
                    terraform init
                    terraform apply \
                        -var="project_name=${PROJECT_NAME}" \
                        -var="lambda_zip_path=${LAMBDA_ZIP}" \
                        -auto-approve
                '''
            }
        }
    }
}
```

---

## Validation

### Check Path Exists

Before deploying, validate the ZIP file path:

```bash
#!/bin/bash
# validate-lambda-zip.sh

LAMBDA_ZIP="${1:-./ backend/lambda-deployment.zip}"

if [ ! -f "$LAMBDA_ZIP" ]; then
    echo "❌ Error: Lambda ZIP not found at $LAMBDA_ZIP"
    echo "Please build it first:"
    echo "  cd backend && ./build.sh"
    exit 1
fi

echo "✓ Lambda ZIP found at $LAMBDA_ZIP"
echo "  Size: $(du -h "$LAMBDA_ZIP" | cut -f1)"
echo "  Modified: $(stat -f '%Sm' "$LAMBDA_ZIP" 2>/dev/null || stat -c '%y' "$LAMBDA_ZIP")"
```

### Terraform Plan Check

```bash
#!/bin/bash
# validate-terraform.sh

cd terraform

# Initialize
terraform init > /dev/null 2>&1

# Validate syntax
terraform validate || exit 1

# Check if ZIP file can be read
terraform plan -out=tfplan > /dev/null 2>&1 || {
    echo "❌ Terraform plan failed. Check lambda_zip_path"
    exit 1
}

echo "✓ Terraform configuration is valid"
terraform show tfplan | grep -i lambda
```

---

## Troubleshooting

### Error: "File does not exist"

```
Error: Invalid lambda_zip_path: File does not exist
  on main.tf line 45, in resource "aws_lambda_function" "api":
    45: filename = var.lambda_zip_path
```

**Solution:**
1. Check file exists: `ls -la ./backend/lambda-deployment.zip`
2. Verify path is relative from `terraform/` directory
3. Rebuild ZIP: `cd backend && ./build.sh`

### Error: "No such file or directory"

```
Error: error while reading lambda-deployment.zip: stat ... no such file or directory
```

**Solution:**
```bash
# Print where terraform is looking
cd terraform
echo $PWD  # Shows terraform/ directory

# Verify relative path
ls ../backend/lambda-deployment.zip  # Should exist

# Check terraform.tfvars
cat terraform.tfvars | grep lambda_zip_path
```

### Path Works Locally But Not in CI/CD

```bash
# CI/CD issue: paths may be different

# Solution: Use absolute paths or environment variables in CI/CD
export TF_VAR_lambda_zip_path="$(pwd)/backend/lambda-deployment.zip"
terraform apply
```

---

## Summary

| Format | Example | Best For |
|--------|---------|----------|
| Relative (recommended) | `../backend/lambda-deployment.zip` | Local dev, version control |
| Project root relative | `./backend/lambda-deployment.zip` | Flexibility, different structures |
| Absolute | `/home/user/project/backend/lambda.zip` | CI/CD pipelines, special cases |
| Environment variable | `$TF_VAR_lambda_zip_path` | CI/CD, secrets, dynamic paths |

**Best Practice:** Use relative paths for version control, environment variables for CI/CD.

