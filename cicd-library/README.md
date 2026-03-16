# AI Twin CI/CD Library

A reusable, modular CI/CD infrastructure library for AI Twin projects built with:
- **Terraform Modules** - Scalable, composable infrastructure
- **GitHub Actions** - Automated deployment and destroy workflows
- **Scripts** - Helper utilities for local and cloud deployment

## Quick Start

**🚀 Want to get started immediately?** Read [GETTING_STARTED.md](docs/GETTING_STARTED.md) (5 min setup)

**🔧 Need to customize for your project?** Read [CUSTOMIZATION.md](docs/CUSTOMIZATION.md)

### Option 1: Use as Submodule (Recommended for Team/Shared)

```bash
git submodule add https://github.com/YOUR_USERNAME/ai-twin-cicd-lib.git cicd-lib
```

### Option 2: Copy to Your Project

```bash
cp -r cicd-library/* your-project/
```

### Option 3: Reference Terraform Modules Directly

```hcl
module "storage" {
  source = "git::https://github.com/YOUR_USERNAME/ai-twin-cicd-lib.git//terraform/modules/storage"
  
  name_prefix = "my-project-dev"
  common_tags = local.common_tags
}
```

## Structure

```
cicd-library/
├── terraform/                 # Infrastructure as Code
│   ├── modules/              # Reusable Terraform modules
│   │   ├── storage/          # S3 buckets (frontend + memory)
│   │   ├── compute/          # Lambda + API Gateway + IAM
│   │   └── cdn/              # CloudFront + Route 53
│   ├── main.tf               # Root module composition
│   ├── variables.tf          # Input variables
│   ├── outputs.tf            # Output values
│   ├── versions.tf           # Provider configuration
│   └── backend.tf            # Terraform state backend
├── github-workflows/         # GitHub Actions workflows
│   ├── deploy.yml            # Deploy infrastructure and app
│   └── destroy.yml           # Destroy infrastructure safely
├── scripts/                  # Utility scripts
│   ├── deploy.sh             # Deployment helper
│   ├── destroy.sh            # Cleanup helper
│   ├── init-project.sh       # Project initialization
│   ├── local-dev.sh          # Local development setup
│   └── test-local.sh         # Local testing
├── docs/                     # Documentation
│   ├── GETTING_STARTED.md
│   ├── INTEGRATION_GUIDE.md
│   └── TROUBLESHOOTING.md
└── examples/                 # Example projects
    └── project1/             # Template for new projects
```

## What's Included

### Terraform Modules

**Storage Module**
- S3 bucket for frontend static site
- S3 bucket for conversation memory
- Bucket policies and configurations
- CloudFront origin access

**Compute Module**
- Lambda function for FastAPI backend
- Lambda execution IAM role
- API Gateway REST API
- Request/response logging

**CDN Module**
- CloudFront distribution
- Custom domain support via Route 53
- HTTPS/TLS termination
- Cache policies

### GitHub Actions Workflows

**deploy.yml**
- Triggers on push to main branch
- Builds Lambda deployment package
- Runs Terraform plan/apply
- Builds and deploys Next.js frontend
- Invalidates CloudFront cache

**destroy.yml**
- Manual trigger (workflow_dispatch)
- Safely destroys infrastructure
- Empties S3 buckets before deletion

### Scripts

- `deploy.sh` - Deploy infrastructure and application
- `destroy.sh` - Clean up all resources
- `init-project.sh` - Initialize new project
- `local-dev.sh` - Start backend and frontend locally
- `test-local.sh` - Test local endpoints

## Configuration

Each project needs a `terraform.tfvars` file in the **project root** (not in terraform/ directory):

```hcl
# terraform.tfvars (at project root)
project_name     = "my-ai-twin"
environment      = "dev"
aws_region       = "us-east-1"
lambda_zip_path  = "./backend/lambda-deployment.zip"
bedrock_model_id = "us.amazon.nova-2-lite-v1:0"
```

**📋 See [CUSTOMIZATION.md](docs/CUSTOMIZATION.md) for detailed configuration options and examples.**

### How Users Override Configuration

Users can customize the library in 3 ways:

1. **External terraform.tfvars** (Recommended)
   ```bash
   # Create terraform.tfvars at project root
   terraform plan -var-file=../terraform.tfvars
   ```

2. **Environment Variables**
   ```bash
   export TF_VAR_project_name="my-project"
   terraform plan
   ```

3. **Command-line Arguments**
   ```bash
   terraform plan -var="project_name=my-project"
   ```

**See [LIBRARY_USAGE_PATTERN.md](docs/LIBRARY_USAGE_PATTERN.md) for complete customization patterns.**

## Deployment

### Local Development

```bash
# Start backend and frontend
./scripts/local-dev.sh

# Test endpoints
./scripts/test-local.sh
```

### Deploy to AWS

```bash
# Using Terraform directly
cd terraform
terraform init
terraform plan
terraform apply

# Using helper script
./scripts/deploy.sh
```

### Destroy Resources

```bash
# Using Terraform directly
cd terraform
terraform destroy

# Using helper script
./scripts/destroy.sh
```

## GitHub Actions Setup

1. **Add Secrets to GitHub Repository:**
   - `AWS_ROLE_ARN` - IAM role for OIDC
   - `AWS_REGION` - AWS region (default: us-east-1)

2. **Copy Workflows:**
   ```bash
   cp github-workflows/*.yml .github/workflows/
   ```

3. **Push to Main:**
   ```bash
   git add .github/workflows/
   git commit -m "Add CI/CD workflows"
   git push origin main
   ```

## Documentation

- [Getting Started](docs/GETTING_STARTED.md) - Quick setup guide
- [Customization Guide](docs/CUSTOMIZATION.md) - How to customize for your project
- [Lambda ZIP Path Guide](docs/LAMBDA_ZIP_PATH.md) - How to configure lambda_zip_path for different structures
- [Library Usage Patterns](docs/LIBRARY_USAGE_PATTERN.md) - Variable override patterns
- [Integration Guide](docs/INTEGRATION_GUIDE.md) - How to use in your project
- [Troubleshooting](docs/TROUBLESHOOTING.md) - Common issues and solutions

## Variables Reference

### Required
- `project_name` - Name of your AI Twin project
- `environment` - Deployment environment (dev, staging, prod)

### Optional
- `bedrock_model_id` - AWS Bedrock model to use
- `root_domain` - Custom domain name
- `use_custom_domain` - Enable custom domain (default: false)

## Examples

See the `examples/` directory for template projects.

## License

MIT License - Feel free to use, modify, and share!

## Support

For issues, questions, or contributions:
1. Check [TROUBLESHOOTING.md](docs/TROUBLESHOOTING.md)
2. Create an issue on GitHub
3. Submit a pull request

## Versioning

This library follows semantic versioning:
- Major version for breaking changes
- Minor version for new features
- Patch version for bug fixes

Current version: **v1.0.0-alpha** (Testing in progress)
