# 📚 Library Documentation Index

Quick reference for all documentation files in the CI/CD Library.

## 🚀 Start Here

- **[README.md](README.md)** - Library overview and quick start (5 min)
- **[GETTING_STARTED.md](docs/GETTING_STARTED.md)** - Step-by-step setup guide (10 min)

## 🔧 Configuration & Customization

- **[CUSTOMIZATION.md](docs/CUSTOMIZATION.md)** - How to customize for your project
  - 60-second quick start
  - Required vs optional variables
  - Common customizations
  - Environment-specific configs
  - Git setup for safety

- **[LIBRARY_USAGE_PATTERN.md](docs/LIBRARY_USAGE_PATTERN.md)** - Variable override patterns
  - 3 customization patterns explained
  - When to use each pattern
  - Real-world examples
  - Best practices

- **[LAMBDA_ZIP_PATH.md](docs/LAMBDA_ZIP_PATH.md)** - Lambda ZIP path configuration
  - All path format options
  - Common project structures
  - Dynamic path scripts
  - CI/CD examples (GitHub Actions, GitLab CI, Jenkins)
  - Troubleshooting

## 📖 Integration & Usage

- **[INTEGRATION_GUIDE.md](docs/INTEGRATION_GUIDE.md)** - How to use library in your project
  - 3 usage patterns (submodule, copy, reference)
  - Project setup instructions
  - GitHub Actions integration
  - CI/CD pipeline configuration

- **[TROUBLESHOOTING.md](docs/TROUBLESHOOTING.md)** - Common issues and solutions
  - Terraform errors
  - AWS configuration issues
  - Lambda deployment problems
  - Path and environment issues

## 📝 Reference Files

- **[terraform/terraform.tfvars.example](terraform/terraform.tfvars.example)** - Template for users
  - All available variables documented
  - Examples for each option
  - Inline explanations

- **[terraform/terraform.tfvars](terraform/terraform.tfvars)** - Default values
  - Library defaults only
  - Clear comments explaining it's for defaults
  - Foundation for user overrides

## 🔍 Using This Documentation

### I want to deploy right now
→ Start with [GETTING_STARTED.md](docs/GETTING_STARTED.md)

### I need to customize something
→ Read [CUSTOMIZATION.md](docs/CUSTOMIZATION.md)

### I'm having path issues
→ Check [LAMBDA_ZIP_PATH.md](docs/LAMBDA_ZIP_PATH.md)

### I want to understand all options
→ Read [LIBRARY_USAGE_PATTERN.md](docs/LIBRARY_USAGE_PATTERN.md)

### I'm integrating into my project
→ Follow [INTEGRATION_GUIDE.md](docs/INTEGRATION_GUIDE.md)

### I have a problem
→ Check [TROUBLESHOOTING.md](docs/TROUBLESHOOTING.md)

### I need a configuration template
→ Copy [terraform/terraform.tfvars.example](terraform/terraform.tfvars.example)

---

## 📊 Documentation Summary

| File | Purpose | Time | Audience |
|------|---------|------|----------|
| README | Overview | 5 min | Everyone |
| GETTING_STARTED | Quick setup | 10 min | New users |
| CUSTOMIZATION | How to customize | 15 min | Users |
| LAMBDA_ZIP_PATH | ZIP path config | 10 min | Users with path issues |
| LIBRARY_USAGE_PATTERN | Variable patterns | 10 min | Advanced users |
| INTEGRATION_GUIDE | Using the library | 15 min | Integrating into projects |
| TROUBLESHOOTING | Problem solving | 5-30 min | When issues arise |
| terraform.tfvars.example | Template | - | Reference |

---

## 🎯 Common Paths Through Documentation

### Path 1: First-Time User (25 minutes)
1. README.md (5 min)
2. GETTING_STARTED.md (10 min)
3. CUSTOMIZATION.md (10 min)
4. Deploy! 🚀

### Path 2: Customization Deep Dive (35 minutes)
1. CUSTOMIZATION.md (15 min)
2. LIBRARY_USAGE_PATTERN.md (10 min)
3. LAMBDA_ZIP_PATH.md (10 min)

### Path 3: CI/CD Integration (20 minutes)
1. INTEGRATION_GUIDE.md (15 min)
2. LAMBDA_ZIP_PATH.md - CI/CD section (5 min)

### Path 4: Troubleshooting (Varies)
1. TROUBLESHOOTING.md
2. Specific guide (LAMBDA_ZIP_PATH.md, etc.)

---

## 📌 Key Files Location

```
cicd-library/
├── README.md                          ← Start here
├── docs/
│   ├── GETTING_STARTED.md            ← Quick setup
│   ├── CUSTOMIZATION.md              ← How to customize
│   ├── LIBRARY_USAGE_PATTERN.md      ← Variable patterns
│   ├── LAMBDA_ZIP_PATH.md            ← ZIP path config
│   ├── INTEGRATION_GUIDE.md          ← Using the library
│   ├── TROUBLESHOOTING.md            ← Problem solving
│   └── (this index file)
├── terraform/
│   ├── terraform.tfvars.example      ← User template
│   ├── terraform.tfvars              ← Library defaults
│   └── ...
└── ...
```

---

## ✅ Quality Checklist

- ✅ Every documentation file has a clear purpose
- ✅ Examples are complete and runnable
- ✅ Common paths documented
- ✅ Troubleshooting section provided
- ✅ Reference templates available
- ✅ This index helps users navigate

---

## 🎓 Learning Resources

### Videos (Recommended Order)
1. GitHub Actions deployment workflow
2. Terraform module composition
3. AWS Lambda with API Gateway
4. FastAPI basics
5. Next.js deployment to S3 + CloudFront

### External Documentation
- [Terraform Documentation](https://www.terraform.io/docs)
- [AWS Lambda Guide](https://docs.aws.amazon.com/lambda/)
- [GitHub Actions Documentation](https://docs.github.com/actions)
- [AWS Bedrock API](https://docs.aws.amazon.com/bedrock/)

---

## 🤝 Contributing Documentation

When adding new features to the library:

1. Update relevant .md files
2. Add examples to terraform.tfvars.example
3. Add troubleshooting steps if needed
4. Update this index if adding new docs
5. Keep examples runnable and tested

---

**Last Updated:** 2026-03-03
**Library Version:** 1.0.0
**Documentation Version:** 1.0.0

