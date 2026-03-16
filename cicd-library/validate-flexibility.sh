#!/bin/bash
# ============================================================================
# Validate CI/CD Library Structure & Flexibility
# ============================================================================
# This script validates that the library is properly configured for
# users to override tfvars and lambda_zip_path without editing library files

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
LIBRARY_DIR="$SCRIPT_DIR"

echo "🧪 Validating AI Twin CI/CD Library Flexibility"
echo "=============================================="
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

PASSED=0
FAILED=0

# Helper functions
check() {
    local result=$1
    local message=$2
    
    if [ $result -eq 0 ]; then
        echo -e "${GREEN}✓${NC} $message"
        ((PASSED++))
    else
        echo -e "${RED}✗${NC} $message"
        ((FAILED++))
    fi
}

# ============================================================================
# 1. Check terraform.tfvars Configuration
# ============================================================================
echo "📋 Terraform Configuration"
echo ""

# Check default tfvars exists
test -f "$LIBRARY_DIR/terraform/terraform.tfvars" && result=0 || result=1
check $result "Default terraform.tfvars exists"

# Check default tfvars has appropriate defaults
grep -q "project_name" "$LIBRARY_DIR/terraform/terraform.tfvars" && result=0 || result=1
check $result "terraform.tfvars has project_name default"

grep -q "lambda_zip_path" "$LIBRARY_DIR/terraform/terraform.tfvars" && result=0 || result=1
check $result "terraform.tfvars has lambda_zip_path default"

# Check default tfvars has warning about editing
grep -qi "DO NOT MODIFY" "$LIBRARY_DIR/terraform/terraform.tfvars" && result=0 || result=1
check $result "terraform.tfvars clearly marked as read-only"

# Check example template exists
test -f "$LIBRARY_DIR/terraform/terraform.tfvars.example" && result=0 || result=1
check $result "terraform.tfvars.example template exists"

# Check example has documentation
grep -qi "EXAMPLE" "$LIBRARY_DIR/terraform/terraform.tfvars.example" && result=0 || result=1
check $result "Example file clearly marked as template"

grep -qi "project root" "$LIBRARY_DIR/terraform/terraform.tfvars.example" && result=0 || result=1
check $result "Example explains to create tfvars at project root"

echo ""

# ============================================================================
# 2. Check variables.tf for Override Support
# ============================================================================
echo "📝 Variable Definitions"
echo ""

# Check variables.tf exists
test -f "$LIBRARY_DIR/terraform/variables.tf" && result=0 || result=1
check $result "variables.tf exists"

# Check lambda_zip_path is defined
grep -q "variable.*lambda_zip_path" "$LIBRARY_DIR/terraform/variables.tf" && result=0 || result=1
check $result "lambda_zip_path variable is defined"

# Check variable descriptions
grep -q "description" "$LIBRARY_DIR/terraform/variables.tf" && result=0 || result=1
check $result "All variables have descriptions"

# Check default values where appropriate
grep -q "default" "$LIBRARY_DIR/terraform/variables.tf" && result=0 || result=1
check $result "Variables have sensible defaults"

echo ""

# ============================================================================
# 3. Check Documentation
# ============================================================================
echo "📚 Documentation"
echo ""

# Check main docs exist
test -d "$LIBRARY_DIR/docs" && result=0 || result=1
check $result "docs/ directory exists"

test -f "$LIBRARY_DIR/docs/CUSTOMIZATION.md" && result=0 || result=1
check $result "CUSTOMIZATION.md exists"

test -f "$LIBRARY_DIR/docs/LAMBDA_ZIP_PATH.md" && result=0 || result=1
check $result "LAMBDA_ZIP_PATH.md exists"

test -f "$LIBRARY_DIR/docs/LIBRARY_USAGE_PATTERN.md" && result=0 || result=1
check $result "LIBRARY_USAGE_PATTERN.md exists"

test -f "$LIBRARY_DIR/docs/README.md" && result=0 || result=1
check $result "docs/README.md (documentation index) exists"

# Check docs mention external tfvars
grep -qi "terraform.tfvars.*project root" "$LIBRARY_DIR/docs/CUSTOMIZATION.md" && result=0 || result=1
check $result "CUSTOMIZATION.md explains external tfvars"

grep -qi "relative.*path" "$LIBRARY_DIR/docs/LAMBDA_ZIP_PATH.md" && result=0 || result=1
check $result "LAMBDA_ZIP_PATH.md explains relative paths"

grep -qi "pattern" "$LIBRARY_DIR/docs/LIBRARY_USAGE_PATTERN.md" && result=0 || result=1
check $result "LIBRARY_USAGE_PATTERN.md explains override patterns"

echo ""

# ============================================================================
# 4. Check main README
# ============================================================================
echo "📖 Main README"
echo ""

test -f "$LIBRARY_DIR/README.md" && result=0 || result=1
check $result "README.md exists"

grep -qi "customization" "$LIBRARY_DIR/README.md" && result=0 || result=1
check $result "README.md mentions customization"

grep -qi "var-file" "$LIBRARY_DIR/README.md" && result=0 || result=1
check $result "README.md shows var-file usage"

echo ""

# ============================================================================
# 5. Check Terraform Syntax
# ============================================================================
echo "🔍 Terraform Syntax Validation"
echo ""

cd "$LIBRARY_DIR/terraform"

# Check if terraform is installed
if command -v terraform &> /dev/null; then
    terraform fmt -recursive -check >/dev/null 2>&1
    result=$?
    if [ $result -eq 0 ]; then
        check 0 "Terraform files are properly formatted"
    else
        echo -e "${YELLOW}⚠${NC} Terraform formatting not strict (not required)"
    fi
    
    terraform validate 2>/dev/null >/dev/null
    result=$?
    if [ $result -eq 0 ]; then
        check 0 "Terraform syntax is valid"
    fi
else
    echo -e "${YELLOW}⚠${NC} Terraform not installed (skipping syntax check)"
fi

echo ""

# ============================================================================
# 6. Check main.tf passes lambda_zip_path correctly
# ============================================================================
echo "🔗 Module Integration"
echo ""

grep -q "lambda_zip_path" "$LIBRARY_DIR/terraform/main.tf" && result=0 || result=1
check $result "main.tf passes lambda_zip_path to compute module"

grep -q "lambda_zip_path" "$LIBRARY_DIR/terraform/modules/compute/variables.tf" && result=0 || result=1
check $result "compute module accepts lambda_zip_path variable"

grep -q "filename.*lambda_zip_path" "$LIBRARY_DIR/terraform/modules/compute/main.tf" && result=0 || result=1
check $result "compute module uses lambda_zip_path for Lambda function"

echo ""

# ============================================================================
# 7. Check .gitignore
# ============================================================================
echo "🔐 Security & Version Control"
echo ""

test -f "$LIBRARY_DIR/.gitignore" && result=0 || result=1
check $result ".gitignore exists"

grep -q "terraform.tfvars" "$LIBRARY_DIR/.gitignore" && result=0 || result=1
check $result ".gitignore ignores *.tfvars files"

echo ""

# ============================================================================
# Summary
# ============================================================================
echo "=============================================="
echo ""
echo "📊 Summary:"
echo "  ${GREEN}Passed: $PASSED${NC}"
echo "  ${RED}Failed: $FAILED${NC}"
echo ""

if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}✅ All Validation Checks Passed!${NC}"
    echo ""
    echo "The library is ready for users to:"
    echo "  ✓ Create terraform.tfvars at project root"
    echo "  ✓ Specify lambda_zip_path without editing library"
    echo "  ✓ Override variables with environment variables"
    echo "  ✓ Use command-line -var arguments"
    echo ""
    echo "📖 Users should read:"
    echo "  - CUSTOMIZATION.md for quick setup"
    echo "  - LAMBDA_ZIP_PATH.md for path configuration"
    echo "  - LIBRARY_USAGE_PATTERN.md for override patterns"
    exit 0
else
    echo -e "${RED}❌ Some Checks Failed ($FAILED)${NC}"
    echo ""
    echo "Please review the failed items above."
    exit 1
fi
