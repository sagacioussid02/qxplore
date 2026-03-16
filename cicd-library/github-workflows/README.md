# GitHub Actions Workflows

This directory contains reusable GitHub Actions workflows for deploying and destroying AI Twin infrastructure.

## Available Workflows

### deploy.yml

**Trigger:** Automatic on push to `main` branch

**What it does:**
1. Checks out code
2. Sets up Terraform
3. Initializes Terraform
4. Plans infrastructure changes
5. Applies Terraform configuration
6. Builds Lambda deployment package
7. Builds Next.js frontend
8. Deploys frontend to S3
9. Invalidates CloudFront cache

**Required Secrets:**
- `AWS_ROLE_ARN` - IAM role for OIDC authentication
- `AWS_REGION` - AWS region (default: us-east-1)

**Files used:**
- `scripts/deploy.sh`
- `terraform/main.tf` (and other terraform files)

### destroy.yml

**Trigger:** Manual trigger via `workflow_dispatch`

**What it does:**
1. Checks out code
2. Sets up Terraform
3. Initializes Terraform
4. Empties S3 buckets (to avoid deletion errors)
5. Destroys all infrastructure

**Required Secrets:**
- `AWS_ROLE_ARN`
- `AWS_REGION`

**Files used:**
- `scripts/destroy.sh`
- `terraform/main.tf`

## Setup

### 1. Copy Workflows to Your Project

```bash
mkdir -p .github/workflows
cp github-workflows/*.yml .github/workflows/
```

### 2. Add GitHub Secrets

Go to GitHub repository → Settings → Secrets and variables → Actions

Add these secrets:

```
AWS_ROLE_ARN: arn:aws:iam::ACCOUNT_ID:role/github-oidc-role
AWS_REGION: us-east-1
```

### 3. Update Workflow Paths (if needed)

If using submodule, workflows reference:
```yaml
run: ./cicd-lib/scripts/deploy.sh
run: ./cicd-lib/terraform/...
```

If you copied files, update to:
```yaml
run: ./scripts/deploy.sh
run: ./terraform/...
```

## Usage

### Deploy

```bash
# Automatic: Push to main branch
git add .
git commit -m "Make changes"
git push origin main

# Check progress:
# GitHub → Actions tab → Latest run
```

### Destroy

```bash
# Manual trigger from GitHub UI:
# GitHub → Actions → Destroy
# Click "Run workflow"

# Or via GitHub CLI:
gh workflow run destroy.yml
```

## Workflow File Structure

Each workflow file contains:

```yaml
name: Deploy                     # Workflow name
on:                              # Trigger conditions
  push:
    branches: [main]

env:                             # Environment variables
  AWS_REGION: us-east-1

jobs:                            # Jobs to run
  deploy:
    runs-on: ubuntu-latest       # Runner
    permissions:                 # Required permissions
      id-token: write
      contents: read
    
    steps:                       # Individual steps
      - uses: actions/checkout@v4
      - run: echo "Hello"
```

## Example: Custom Workflow

Create your own workflow by copying a template:

```yaml
# .github/workflows/custom.yml
name: Custom Deployment

on:
  workflow_dispatch:  # Manual trigger
  
jobs:
  custom:
    runs-on: ubuntu-latest
    permissions:
      id-token: write
      contents: read
    
    steps:
      - uses: actions/checkout@v4
      
      - name: Configure AWS
        uses: aws-actions/configure-aws-credentials@v2
        with:
          role-to-assume: ${{ secrets.AWS_ROLE_ARN }}
          aws-region: ${{ secrets.AWS_REGION }}
      
      - name: Run Custom Script
        run: ./scripts/custom-script.sh
```

## Troubleshooting

### Workflow not showing up

```bash
# Ensure file exists and is valid YAML
ls -la .github/workflows/

# Validate YAML syntax
yamllint .github/workflows/deploy.yml
```

### Workflow fails at AWS authentication

```bash
# Check secrets are configured
# GitHub → Settings → Secrets

# Verify IAM role exists
aws iam get-role --role-name github-oidc-role
```

### Long running workflows

```yaml
# Increase timeout in workflow file
jobs:
  deploy:
    timeout-minutes: 60  # Default is 360
```

## Variables Passed from Workflows

Workflows pass variables to scripts and Terraform:

```bash
# Available in deploy.sh:
PROJECT_NAME          # From terraform.tfvars
ENVIRONMENT          # From terraform.tfvars  
AWS_REGION           # From secrets
```

## Monitoring

### View Workflow Runs

```bash
# Via GitHub UI:
GitHub → Actions → Select workflow → View runs

# Via GitHub CLI:
gh run list
gh run view RUN_ID
gh run logs RUN_ID
```

### Check Deployment Status

```bash
# AWS resources
aws s3 ls
aws apigateway get-rest-apis
aws lambda list-functions

# Terraform state
terraform state list
```

## Best Practices

1. **Test locally first:**
   ```bash
   ./scripts/local-dev.sh
   ./scripts/test-local.sh
   ```

2. **Review plan before apply:**
   - Workflows run terraform plan first
   - Review output in workflow logs
   - Ensure changes are expected

3. **Use separate environments:**
   ```yaml
   # Create separate workflows for dev/prod
   - deploy-dev.yml  (triggers on push to dev)
   - deploy-prod.yml (triggers on push to main)
   ```

4. **Set up notifications:**
   - GitHub Actions can send Slack/email notifications
   - Configure in repository settings

5. **Keep secrets secure:**
   - Never commit secrets to git
   - Use GitHub Secrets for sensitive data
   - Rotate credentials regularly

## Advanced Configurations

### Matrix Strategy (Multiple Environments)

```yaml
strategy:
  matrix:
    environment: [dev, staging, prod]

env:
  TF_VAR_ENVIRONMENT: ${{ matrix.environment }}
```

### Conditional Steps

```yaml
- name: Deploy Frontend
  if: github.ref == 'refs/heads/main'
  run: ./scripts/deploy-frontend.sh
```

### Caching Dependencies

```yaml
- uses: actions/cache@v3
  with:
    path: terraform/.terraform
    key: terraform-${{ hashFiles('terraform/.terraform.lock.hcl') }}
```

## Support

See [TROUBLESHOOTING.md](../docs/TROUBLESHOOTING.md) for common issues.

## References

- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [AWS GitHub Actions](https://github.com/aws-actions)
- [Terraform GitHub Actions](https://github.com/hashicorp/setup-terraform)
