// Load environment variables
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '..', '.env') });

// Verify environment variables are loaded
console.log('Environment Check:');
console.log('AWS Region:', process.env.AWS_REGION);
console.log('AWS Account ID:', process.env.AWS_ACCOUNT_ID);
console.log('AWS Access Key ID:', process.env.AWS_ACCESS_KEY_ID ? '✓ Present' : '✗ Missing');
console.log('AWS Secret Access Key:', process.env.AWS_SECRET_ACCESS_KEY ? '✓ Present' : '✗ Missing');

// Initialize AWS clients with explicit credentials
const awsConfig = {
    region: process.env.AWS_REGION,
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
    }
};

const { 
    DynamoDBClient, 
    CreateTableCommand 
} = require('@aws-sdk/client-dynamodb');
const { 
    EventBridgeClient, 
    PutRuleCommand, 
    PutTargetsCommand 
} = require('@aws-sdk/client-eventbridge');
const { 
    IAMClient, 
    PutRolePolicyCommand 
} = require('@aws-sdk/client-iam');

// Initialize clients with explicit configuration
const dynamoClient = new DynamoDBClient(awsConfig);
const eventBridgeClient = new EventBridgeClient(awsConfig);
const iamClient = new IAMClient(awsConfig);

async function createCostReportsTable() {
    try {
        const command = new CreateTableCommand({
            TableName: 'CostReports',
            AttributeDefinitions: [{
                AttributeName: 'id',
                AttributeType: 'S'
            }],
            KeySchema: [{
                AttributeName: 'id',
                KeyType: 'HASH'
            }],
            ProvisionedThroughput: {
                ReadCapacityUnits: 5,
                WriteCapacityUnits: 5
            }
        });

        await dynamoClient.send(command);
        console.log('✅ CostReports table created successfully');
    } catch (error) {
        if (error.name === 'ResourceInUseException') {
            console.log('Table already exists, skipping creation');
        } else {
            throw error;
        }
    }
}

async function createDailyTrigger() {
    try {
        // Create CloudWatch Events rule
        const ruleName = 'DailyCostReportTrigger';
        await eventBridgeClient.send(new PutRuleCommand({
            Name: ruleName,
            ScheduleExpression: 'cron(0 2 * * ? *)', // 02:00 UTC daily
            State: 'ENABLED',
            Description: 'Triggers Lambda to collect daily cost reports'
        }));

        // Add Lambda as target
        await eventBridgeClient.send(new PutTargetsCommand({
            Rule: ruleName,
            Targets: [{
                Id: 'CostReportLambda',
                Arn: `arn:aws:lambda:${process.env.AWS_REGION}:${process.env.AWS_ACCOUNT_ID}:function:CustomerAPI`
            }]
        }));

        console.log('✅ CloudWatch Event trigger created successfully');
    } catch (error) {
        console.error('Error creating CloudWatch Event:', error);
        throw error;
    }
}

async function setup() {
    try {
        console.log('Starting setup...');
        await createCostReportsTable();
        await createDailyTrigger();
        console.log('✅ Setup completed successfully!');
    } catch (error) {
        console.error('Setup failed:', error);
        process.exit(1);
    }
}

setup(); 