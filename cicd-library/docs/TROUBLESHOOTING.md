# Troubleshooting Guide

Common issues and solutions when using the AI Twin CI/CD Library.

## Terraform Issues

### Error: Error acquiring the state lock

**Problem:** Terraform state is locked from a previous failed deployment.

**Solution:**

```bash
# Get lock ID from error message
terraform force-unlock LOCK_ID

# Example:
terraform force-unlock 1d2b9428-2cdb-fb54-2c85-3e83105ec2cc
```

### Error: resource creation cancelled

**Problem:** Terraform partially created resources before failing.

**Solution:**

```bash
# Refresh state to sync with actual resources
terraform refresh

# Check what exists
terraform state list

# Try again
terraform apply
```

### Error: S3 bucket already exists

**Problem:** Bucket name is globally unique; someone else has it.

**Solution:**

```hcl
# Add random suffix in terraform/main.tf
resource "aws_s3_bucket" "frontend" {
  bucket = "${local.name_prefix}-frontend-${data.aws_caller_identity.current.account_id}"
  # The account_id makes it more unique
}

# Or change project_name in terraform.tfvars
# project_name = "unique-name"
```

### Error: No valid credential sources found

**Problem:** AWS credentials not configured.

**Solution:**

```bash
# Configure AWS credentials
aws configure

# Enter:
# - AWS Access Key ID
# - AWS Secret Access Key
# - Default region (us-east-1)
# - Default output format (json)

# Verify
aws sts get-caller-identity
```

### Error: Lambda code source not found

**Problem:** Lambda deployment package not created properly.

**Solution:**

```bash
# Ensure backend code exists
ls -la backend/

# Ensure lambda_handler.py exists
ls backend/lambda_handler.py

# Check deploy script
cat scripts/deploy.sh

# Run manually:
cd backend
zip -r function.zip . -x "__pycache__/*" "*.pyc"
aws lambda update-function-code \
  --function-name PROJECT-env-backend \
  --zip-file fileb://function.zip
```

### Error: Insufficient capacity.

**Problem:** Lambda capacity exceeded or region unavailable.

**Solution:**

```bash
# Change region in terraform.tfvars
aws_region = "us-west-2"

terraform destroy  # Clean up current region
terraform apply    # Deploy to new region
```

## GitHub Actions Issues

### Workflow not triggering on push

**Problem:** Workflow defined but not running.

**Solution:**

```bash
# Check workflow file syntax
git push origin main

# Go to GitHub Actions tab
# Check "Workflows" section

# If no workflows show:
# 1. Verify .github/workflows/deploy.yml exists
# 2. Check file syntax (YAML)
# 3. Workflows only run on changes to tracked files

# Test by making small change:
echo "# Test" >> README.md
git add README.md
git commit -m "Trigger workflow"
git push
```

### Error: Resource not found

**Problem:** GitHub Actions can't find scripts or Terraform files.

**Solution:**

```bash
# Verify file paths in workflow
cat .github/workflows/deploy.yml

# Should reference correct paths:
# ./cicd/scripts/deploy.sh  (if using cicd submodule)
# ./cicd-lib/scripts/deploy.sh (if using cicd-lib submodule)
# ./scripts/deploy.sh (if copied)

# Fix paths:
sed -i 's|cicd/|cicd-lib/|g' .github/workflows/*.yml
git add .github/workflows/
git commit -m "Fix workflow paths"
git push
```

### Error: AWS credentials not found

**Problem:** GitHub Actions can't authenticate to AWS.

**Solution:**

```bash
# Add repository secrets:
# GitHub → Settings → Secrets and variables → Actions

# New secret: AWS_ROLE_ARN
# Value: arn:aws:iam::ACCOUNT_ID:role/github-oidc-role

# New secret: AWS_REGION  
# Value: us-east-1

# Verify in workflow:
cat .github/workflows/deploy.yml | grep "AWS_ROLE_ARN"
```

### Workflow timeout

**Problem:** Workflow takes too long and times out.

**Solution:**

```yaml
# In .github/workflows/deploy.yml
jobs:
  deploy:
    runs-on: ubuntu-latest
    timeout-minutes: 30  # Increase from default 360

    steps:
      - uses: actions/checkout@v4
        timeout-minutes: 5
```

## AWS Issues

### Lambda timeout

**Problem:** Lambda function times out during execution.

**Solution:**

```hcl
# In terraform/modules/compute/main.tf
resource "aws_lambda_function" "backend" {
  timeout = 60  # Increase from default 30
}

# Or via AWS CLI:
aws lambda update-function-configuration \
  --function-name PROJECT-env-backend \
  --timeout 60
```

### Lambda out of memory

**Problem:** Lambda runs out of memory.

**Solution:**

```hcl
# In terraform/modules/compute/main.tf
resource "aws_lambda_function" "backend" {
  memory_size = 512  # Increase from default 256
}

# Or via AWS CLI:
aws lambda update-function-configuration \
  --function-name PROJECT-env-backend \
  --memory-size 512
```

### API Gateway 502 Bad Gateway

**Problem:** Lambda error or misconfiguration.

**Solution:**

```bash
# Check Lambda logs
aws logs tail /aws/lambda/PROJECT-env-backend --follow

# Check Lambda configuration
aws lambda get-function-configuration \
  --function-name PROJECT-env-backend

# Check API Gateway configuration
aws apigateway get-rest-apis

# Test Lambda directly
aws lambda invoke --function-name PROJECT-env-backend output.json
cat output.json
```

### S3 bucket access denied

**Problem:** Frontend can't access S3 or permissions wrong.

**Solution:**

```bash
# Check bucket policy
aws s3api get-bucket-policy --bucket BUCKET_NAME

# Check CloudFront origin access
aws cloudfront get-distribution-config --id DIST_ID

# Fix via Terraform
terraform plan
terraform apply
```

## Frontend Issues

### Frontend not loading

**Problem:** CloudFront not serving content.

**Solution:**

```bash
# Check CloudFront distribution
aws cloudfront list-distributions --query 'DistributionList.Items[].DomainName'

# Check origin bucket
aws s3 ls s3://PROJECT-dev-frontend-ACCTID/

# Invalidate cache
aws cloudfront create-invalidation \
  --distribution-id DIST_ID \
  --paths "/*"

# Check S3 website config
aws s3api get-bucket-website --bucket BUCKET_NAME
```

### API calls failing from frontend

**Problem:** CORS error or API Gateway not working.

**Solution:**

```bash
# Check CORS in API Gateway
aws apigateway get-rest-apis
aws apigateway get-rest-api --rest-api-id API_ID

# Check backend logs
aws logs tail /aws/lambda/PROJECT-env-backend --follow

# Test endpoint directly
curl https://API_GATEWAY_URL/chat

# Check frontend .env
cat .env.local
# Should have: NEXT_PUBLIC_API_URL=https://API_GATEWAY_URL
```

### Frontend build fails

**Problem:** Build step in GitHub Actions fails.

**Solution:**

```bash
# Test build locally
cd frontend
npm install
npm run build

# Check for errors
npm run lint

# Check environment variables
cat .env.local
cat .env.production (if exists)

# Verify package.json
cat package.json | grep scripts
```

## Local Development Issues

### local-dev.sh fails to start

**Problem:** Script can't start backend/frontend.

**Solution:**

```bash
# Make script executable
chmod +x scripts/local-dev.sh

# Run with verbose output
bash -x scripts/local-dev.sh

# Check Python
python --version  # Should be 3.11+

# Check Node
node --version    # Should be 18+

# Start manually
# Terminal 1:
cd backend
source .venv/bin/activate
python server.py

# Terminal 2:
cd frontend
npm run dev
```

### Port already in use

**Problem:** 8000 or 3000 already in use.

**Solution:**

```bash
# Find process using port
lsof -i :8000
lsof -i :3000

# Kill process
kill -9 PID

# Or use different port
# For backend:
PORT=8001 python server.py

# For frontend:
npm run dev -- -p 3001
```

### Dependencies not installed

**Problem:** Module not found errors.

**Solution:**

```bash
# Backend
cd backend
source .venv/bin/activate
pip install -r requirements.txt

# Frontend
cd frontend
rm -rf node_modules package-lock.json
npm install
```

## Memory/S3 Issues

### Conversations not saving

**Problem:** Memory folder doesn't exist or not writable.

**Solution:**

```bash
# Check directory
ls -la memory/

# Create if missing
mkdir -p memory

# Check permissions
chmod 755 memory

# Check backend .env
cat backend/.env | grep MEMORY_DIR
# Should be: MEMORY_DIR=../memory

# Test by running backend
cd backend
python server.py
# Should create files in memory/ folder
```

### S3 memory bucket not writable

**Problem:** Lambda can't write to S3.

**Solution:**

```bash
# Check IAM role policy
aws iam list-role-policies --role-name PROJECT-env-lambda-role

# Check bucket policy
aws s3api get-bucket-policy --bucket BUCKET_NAME

# Fix via Terraform
terraform apply

# Or manually:
aws iam attach-role-policy \
  --role-name PROJECT-env-lambda-role \
  --policy-arn arn:aws:iam::aws:policy/AmazonS3FullAccess
```

## Performance Issues

### High AWS costs

**Problem:** Unexpected high bills.

**Solution:**

```bash
# Check CloudWatch metrics
aws cloudwatch list-metrics --namespace AWS/Lambda

# Review S3 usage
aws s3api list-objects-v2 --bucket BUCKET_NAME --query 'Contents[].Size' | awk '{sum+=$1} END {print sum/1024/1024 " MB"}'

# Optimize:
# 1. Enable S3 lifecycle policies (archive old data)
# 2. Reduce Lambda memory if possible
# 3. Enable API Gateway caching
# 4. Use CloudFront cache more aggressively
```

### Lambda slow

**Problem:** API responses slow.

**Solution:**

```bash
# Check Lambda duration
aws logs tail /aws/lambda/PROJECT-env-backend --follow

# Increase memory (improves CPU)
terraform apply  # with increased memory_size

# Check Bedrock model
cat backend/.env | grep BEDROCK_MODEL_ID
# Nova is faster than Claude

# Optimize code:
# 1. Cache Bedrock responses
# 2. Reduce conversation history size
# 3. Add request timeout
```

## Need More Help?

1. **Check logs:**
   ```bash
   aws logs tail /aws/lambda/PROJECT-env-backend --follow
   aws logs tail /aws/apigateway/PROJECT-env --follow
   ```

2. **Review Terraform state:**
   ```bash
   terraform state list
   terraform state show RESOURCE_ID
   ```

3. **Test manually:**
   ```bash
   aws lambda invoke --function-name NAME output.json && cat output.json
   curl -v API_ENDPOINT
   ```

4. **Check AWS documentation:**
   - Lambda: https://docs.aws.amazon.com/lambda/
   - API Gateway: https://docs.aws.amazon.com/apigateway/
   - S3: https://docs.aws.amazon.com/s3/
   - CloudFront: https://docs.aws.amazon.com/cloudfront/

5. **GitHub Issues:**
   - Open issue in library repository
   - Include error logs and environment info
