# 🚀 Quick Reference: Using the CI/CD Library

## TL;DR - How Users Customize the Library

### Three Simple Steps

```bash
# Step 1: Create terraform.tfvars at your PROJECT ROOT
cat > terraform.tfvars << 'EOF'
project_name    = "my-ai-twin"
environment     = "prod"
aws_region      = "us-east-1"
lambda_zip_path = "./backend/lambda-deployment.zip"
bedrock_model_id = "us.amazon.nova-2-lite-v1:0"
EOF

# Step 2: Build your Lambda ZIP (if not done)
cd backend && ./build.sh && cd ..

# Step 3: Deploy
cd terraform
terraform init
terraform plan -var-file=../terraform.tfvars
terraform apply -var-file=../terraform.tfvars
```

**Done!** No library modifications needed. 🎉

---

## The Key Concept

**Library files are READ-ONLY defaults. Users override with terraform.tfvars at project root.**

```
┌─────────────────────────────────────────┐
│          Your Project                   │
├─────────────────────────────────────────┤
│                                         │
│  terraform.tfvars  ← USER CREATES THIS │
│       ↓                                 │
│  Overrides defaults in library          │
│                                         │
│  cicd-library/  ← LIBRARY (DON'T EDIT) │
│  ├── terraform/                         │
│  │   └── terraform.tfvars (defaults)    │
│  └── ...                                │
│                                         │
└─────────────────────────────────────────┘
```

---

## Three Ways to Customize

### Method 1: External terraform.tfvars (Easiest)

```bash
# At project root
echo 'project_name = "my-project"' > terraform.tfvars
echo 'lambda_zip_path = "./backend/lambda.zip"' >> terraform.tfvars

cd terraform
terraform plan -var-file=../terraform.tfvars
```

### Method 2: Environment Variables

```bash
export TF_VAR_project_name="my-project"
export TF_VAR_lambda_zip_path="./backend/lambda.zip"

cd terraform
terraform plan
```

### Method 3: Command-line

```bash
cd terraform
terraform plan \
  -var="project_name=my-project" \
  -var="lambda_zip_path=./backend/lambda.zip"
```

---

## lambda_zip_path Options

All of these work:

```hcl
# Relative from project root
lambda_zip_path = "./backend/lambda-deployment.zip"

# Relative from terraform/ directory
lambda_zip_path = "../backend/lambda-deployment.zip"

# Absolute path
lambda_zip_path = "/home/user/my-project/backend/lambda.zip"

# Environment variable
lambda_zip_path = "${var.lambda_zip_path}"  # Set via TF_VAR_
```

---

## Common Project Structures

### Backend in separate folder
```
project/
├── backend/
│   └── lambda-deployment.zip
├── terraform/
├── terraform.tfvars          ← Create this
└── ...

# Use: lambda_zip_path = "./backend/lambda-deployment.zip"
```

### Build folder
```
project/
├── src/
├── build/
│   └── lambda-deployment.zip
├── terraform/
├── terraform.tfvars          ← Create this
└── ...

# Use: lambda_zip_path = "./build/lambda-deployment.zip"
```

### Monorepo
```
monorepo/
├── services/ai-twin/
│   ├── backend/
│   ├── build/lambda.zip
│   └── terraform/
├── terraform.tfvars          ← Create this
└── ...

# Use: lambda_zip_path = "./services/ai-twin/build/lambda.zip"
```

---

## Deploy Steps

```bash
# 1. Create terraform.tfvars
cat > terraform.tfvars << 'EOF'
project_name    = "my-project"
environment     = "dev"
aws_region      = "us-east-1"
lambda_zip_path = "./backend/lambda-deployment.zip"
EOF

# 2. Build Lambda ZIP (if needed)
cd backend
./build.sh
cd ..

# 3. Initialize Terraform
cd terraform
terraform init

# 4. Preview changes
terraform plan -var-file=../terraform.tfvars

# 5. Deploy
terraform apply -var-file=../terraform.tfvars

# 6. View outputs
terraform output
```

---

## Git Configuration

```bash
# Add to .gitignore (don't commit user configs)
echo "terraform.tfvars" >> .gitignore
echo "*.tfvars" >> .gitignore
echo "!terraform.tfvars.example" >> .gitignore

git add .gitignore
git commit -m "Add terraform files to gitignore"
```

---

## Troubleshooting

### "File does not exist"
```bash
# Check if ZIP exists
ls -la ./backend/lambda-deployment.zip

# Or build it
cd backend && ./build.sh && cd ..
```

### "Terraform not initialized"
```bash
cd terraform
terraform init
```

### "Variable required"
```bash
# Add to terraform.tfvars
echo 'project_name = "my-project"' >> ../terraform.tfvars
```

### Wrong working directory
```bash
# Make sure you're in the right place
cd terraform
terraform plan -var-file=../terraform.tfvars
```

---

## Environment-Specific Configs

### Multiple environments

```bash
# Create separate tfvars files
terraform.tfvars.dev
terraform.tfvars.staging
terraform.tfvars.prod

# Deploy to specific environment
cd terraform

# Dev
terraform apply -var-file=../terraform.tfvars.dev

# Staging  
terraform apply -var-file=../terraform.tfvars.staging

# Production
terraform apply -var-file=../terraform.tfvars.prod
```

---

## CI/CD Integration

### GitHub Actions

```yaml
name: Deploy
on: [push]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Build Lambda
        run: |
          cd backend
          ./build.sh
      
      - name: Create tfvars
        run: |
          cat > terraform.tfvars << EOF
          project_name = "${{ secrets.PROJECT_NAME }}"
          lambda_zip_path = "./backend/lambda-deployment.zip"
          EOF
      
      - name: Deploy
        env:
          AWS_ACCESS_KEY_ID: ${{ secrets.AWS_ACCESS_KEY_ID }}
          AWS_SECRET_ACCESS_KEY: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
        run: |
          cd terraform
          terraform init
          terraform apply -auto-approve -var-file=../terraform.tfvars
```

---

## Documentation

- **Quick Start**: [GETTING_STARTED.md](docs/GETTING_STARTED.md)
- **Full Customization**: [CUSTOMIZATION.md](docs/CUSTOMIZATION.md)
- **Path Details**: [LAMBDA_ZIP_PATH.md](docs/LAMBDA_ZIP_PATH.md)
- **Override Patterns**: [LIBRARY_USAGE_PATTERN.md](docs/LIBRARY_USAGE_PATTERN.md)
- **Issues**: [TROUBLESHOOTING.md](docs/TROUBLESHOOTING.md)

---

## Key Rules

✅ **DO**
- Create terraform.tfvars at PROJECT ROOT
- Use relative paths in terraform.tfvars
- Add terraform.tfvars to .gitignore
- Run terraform from terraform/ directory with -var-file=../...
- Use terraform.tfvars.example as a template

❌ **DON'T**
- Edit files inside cicd-library/
- Commit terraform.tfvars to git
- Use absolute paths in version control
- Modify terraform.tfvars from library
- Change library default values

---

## Summary

| Task | Command |
|------|---------|
| **Create config** | `cp terraform/terraform.tfvars.example terraform.tfvars && nano terraform.tfvars` |
| **Build Lambda** | `cd backend && ./build.sh && cd ..` |
| **Initialize** | `cd terraform && terraform init` |
| **Preview** | `terraform plan -var-file=../terraform.tfvars` |
| **Deploy** | `terraform apply -var-file=../terraform.tfvars` |
| **Check outputs** | `terraform output` |
| **Destroy** | `terraform destroy -var-file=../terraform.tfvars` |

---

**That's it! The library is flexible and ready to use.** 🚀

Questions? See [TROUBLESHOOTING.md](docs/TROUBLESHOOTING.md)

