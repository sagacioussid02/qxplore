# ============================================================================
# DEFAULT TERRAFORM VARIABLES FOR CI/CD LIBRARY
# ============================================================================
#
# DO NOT MODIFY THIS FILE!
# 
# This file contains default values only. To customize your deployment:
#
# 1. Create terraform.tfvars at your PROJECT ROOT (outside terraform/ dir)
# 2. Copy values from terraform.tfvars.example
# 3. Update them with your specific values
# 4. Run: terraform plan -var-file=../terraform.tfvars
#
# ============================================================================

# Default project name (MUST override in your terraform.tfvars)
project_name = "default-project"

# Default environment
environment = "dev"

# Default AWS region
aws_region = "us-east-1"

# Default Lambda zip path (MUST override with actual path)
# User should provide relative or absolute path in their terraform.tfvars
lambda_zip_path = "./lambda-deployment.zip"

# Default Bedrock model (Nova Lite - fastest and cheapest)
bedrock_model_id = "us.amazon.nova-2-lite-v1:0"

# Default Lambda configuration
lambda_timeout = 60

# Default API Gateway throttling
api_throttle_burst_limit = 10
api_throttle_rate_limit  = 5

# Default custom domain configuration (disabled)
use_custom_domain = false
root_domain       = ""
