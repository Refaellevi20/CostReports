require('dotenv').config();

const { 
    LambdaClient, 
    GetFunctionCommand,
    InvokeCommand 
} = require('@aws-sdk/client-lambda');
const { 
    DynamoDBClient 
} = require('@aws-sdk/client-dynamodb');
const { 
    DynamoDBDocumentClient, 
    ScanCommand 
} = require('@aws-sdk/lib-dynamodb');
const { 
    CloudWatchEventsClient, 
    DescribeRuleCommand 
} = require('@aws-sdk/client-cloudwatch-events');

// AWS Configuration
const awsConfig = {
    region: process.env.AWS_REGION || 'eu-west-1',
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
    }
};

// Initialize clients with configuration
const lambdaClient = new LambdaClient(awsConfig);
const dynamoClient = new DynamoDBClient(awsConfig);
const docClient = DynamoDBDocumentClient.from(dynamoClient);
const eventsClient = new CloudWatchEventsClient(awsConfig);

async function testDeployment() {
    console.log('🔍 Starting deployment test...\n');

    try {
        // Test 1: Check Lambda Function
        console.log('Testing Lambda Function...');
        const lambdaResponse = await lambdaClient.send(new GetFunctionCommand({
            FunctionName: 'CustomerAPI'
        }));
        console.log('✅ Lambda Function exists');
        console.log('Runtime:', lambdaResponse.Configuration.Runtime);
        console.log('Last Modified:', lambdaResponse.Configuration.LastModified);
        console.log();

        // Test 2: Check DynamoDB Tables
        console.log('Testing DynamoDB Tables...');
        
        // Check Users table
        const usersData = await docClient.send(new ScanCommand({
            TableName: 'Users',
            Limit: 1
        }));
        console.log('✅ Users table exists and is accessible');
        console.log('Users count:', usersData.Count);
        
        // Check CostReports table
        const reportsData = await docClient.send(new ScanCommand({
            TableName: 'CostReports',
            Limit: 1
        }));
        console.log('✅ CostReports table exists and is accessible');
        console.log('Reports count:', reportsData.Count);
        console.log();

        // Test 3: Check CloudWatch Event Rule
        console.log('Testing CloudWatch Event Rule...');
        const ruleResponse = await eventsClient.send(new DescribeRuleCommand({
            Name: 'DailyCostReportTrigger'
        }));
        console.log('✅ CloudWatch Event Rule exists');
        console.log('Schedule:', ruleResponse.ScheduleExpression);
        console.log('State:', ruleResponse.State);
        console.log();

        // Test 4: Invoke Lambda directly
        console.log('Testing Lambda Function execution...');
        const testEvent = {
            path: '/api/costs',
            httpMethod: 'GET'
        };
        
        const invokeResponse = await lambdaClient.send(new InvokeCommand({
            FunctionName: 'CustomerAPI',
            Payload: JSON.stringify(testEvent)
        }));

        const payload = Buffer.from(invokeResponse.Payload).toString();
        console.log('✅ Lambda Function executed successfully');
        console.log('Response:', payload);

        console.log('\n✅ All tests passed successfully!');

    } catch (error) {
        console.error('\n❌ Test failed:', error);
        process.exit(1);
    }
}

// Run tests
testDeployment(); 