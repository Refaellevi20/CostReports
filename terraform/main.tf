provider "aws" {
  region = "eu-west-1"
}

# IAM Role for Lambda
resource "aws_iam_role" "lambda_role" {
  name = "lambda-cost-explorer-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action = "sts:AssumeRole"
      Effect = "Allow"
      Principal = {
        Service = "lambda.amazonaws.com"
      }
    }]
  })
}

# IAM Policy for Cost Explorer and DynamoDB access
resource "aws_iam_role_policy" "lambda_policy" {
  name = "lambda-cost-explorer-policy"
  role = aws_iam_role.lambda_role.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "ce:GetCostAndUsage",
          "dynamodb:PutItem"
        ]
        Resource = "*"
      }
    ]
  })
}

# DynamoDB Table
resource "aws_dynamodb_table" "cost_reports" {
  name           = "CostReports"
  billing_mode   = "PAY_PER_REQUEST"
  hash_key       = "id"

  attribute {
    name = "id"
    type = "S"
  }
}

# Lambda Function
resource "aws_lambda_function" "cost_explorer" {
  filename         = "../function.zip"
  function_name    = "CustomerAPI"
  role            = aws_iam_role.lambda_role.arn
  handler         = "index.handler"
  runtime         = "nodejs18.x"

  environment {
    variables = {
      DYNAMODB_TABLE = aws_dynamodb_table.cost_reports.name
    }
  }
}

# CloudWatch Event Rule
resource "aws_cloudwatch_event_rule" "daily_cost_report" {
  name                = "DailyCostReportTrigger"
  description         = "Triggers Lambda to collect daily cost reports"
  schedule_expression = "cron(0 2 * * ? *)"
}

# CloudWatch Event Target
resource "aws_cloudwatch_event_target" "lambda_target" {
  rule      = aws_cloudwatch_event_rule.daily_cost_report.name
  target_id = "CostReportLambda"
  arn       = aws_lambda_function.cost_explorer.arn
}

# Lambda permission for CloudWatch Events
resource "aws_lambda_permission" "allow_cloudwatch" {
  statement_id  = "AllowExecutionFromCloudWatch"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.cost_explorer.function_name
  principal     = "events.amazonaws.com"
  source_arn    = aws_cloudwatch_event_rule.daily_cost_report.arn
} 