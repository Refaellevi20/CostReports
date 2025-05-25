resource "aws_api_gateway_rest_api" "cost_api" {
  name = "cost-explorer-api"
}

resource "aws_api_gateway_resource" "costs" {
  rest_api_id = aws_api_gateway_rest_api.cost_api.id
  parent_id   = aws_api_gateway_rest_api.cost_api.root_resource_id
  path_part   = "costs"
}

resource "aws_api_gateway_method" "get_costs" {
  rest_api_id   = aws_api_gateway_rest_api.cost_api.id
  resource_id   = aws_api_gateway_resource.costs.id
  http_method   = "GET"
  authorization = "NONE"
}

resource "aws_api_gateway_integration" "lambda" {
  rest_api_id = aws_api_gateway_rest_api.cost_api.id
  resource_id = aws_api_gateway_resource.costs.id
  http_method = aws_api_gateway_method.get_costs.http_method
  
  integration_http_method = "POST"
  type                   = "AWS_PROXY"
  uri                    = aws_lambda_function.cost_explorer.invoke_arn
}

resource "aws_api_gateway_deployment" "api" {
  rest_api_id = aws_api_gateway_rest_api.cost_api.id
  
  depends_on = [
    aws_api_gateway_integration.lambda
  ]

  lifecycle {
    create_before_destroy = true
  }
}

resource "aws_api_gateway_stage" "prod" {
  deployment_id = aws_api_gateway_deployment.api.id
  rest_api_id   = aws_api_gateway_rest_api.cost_api.id
  stage_name    = "prod"
} 