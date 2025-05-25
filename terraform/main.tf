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
          "dynamodb:PutItem",
          "dynamodb:GetItem",
          "dynamodb:Query",
          "dynamodb:Scan",
          "dynamodb:UpdateItem",
          "dynamodb:DeleteItem"
        ]
        Resource = [
          aws_dynamodb_table.users.arn,
          aws_dynamodb_table.cost_reports.arn,
          "${aws_dynamodb_table.users.arn}/index/*",
          "${aws_dynamodb_table.cost_reports.arn}/index/*"
        ]
      }
    ]
  })
}

# DynamoDB Tables
resource "aws_dynamodb_table" "users" {
  name           = "Users"
  billing_mode   = "PAY_PER_REQUEST"
  hash_key       = "userId"

  attribute {
    name = "userId"
    type = "S"
  }

  attribute {
    name = "email"
    type = "S"
  }

  global_secondary_index {
    name               = "EmailIndex"
    hash_key           = "email"
    projection_type    = "ALL"
  }
}

resource "aws_dynamodb_table" "cost_reports" {
  name           = "CostReports"
  billing_mode   = "PAY_PER_REQUEST"
  hash_key       = "id"
  range_key      = "timestamp"  # Added for time-series data

  attribute {
    name = "id"
    type = "S"
  }

  attribute {
    name = "timestamp"
    type = "S"
  }

  attribute {
    name = "userId"
    type = "S"
  }

  global_secondary_index {
    name               = "UserReportsIndex"
    hash_key           = "userId"
    range_key         = "timestamp"
    projection_type    = "ALL"
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