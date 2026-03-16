output "lambda_function_arn" {
  value = aws_lambda_function.api.arn
}

output "lambda_function_name" {
  value = aws_lambda_function.api.function_name
}

output "api_gateway_endpoint" {
  value = aws_apigatewayv2_api.main.api_endpoint
}

output "api_gateway_execution_arn" {
  value = aws_apigatewayv2_api.main.execution_arn
}
