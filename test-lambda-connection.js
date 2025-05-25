require('dotenv').config();
const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, ScanCommand } = require('@aws-sdk/lib-dynamodb');

// Initialize DynamoDB client with explicit configuration
const client = new DynamoDBClient({ 
    region: 'eu-west-1', // Explicitly set region
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
    }
});

const docClient = DynamoDBDocumentClient.from(client);

async function testLambdaConnection() {
    console.log('Starting connection test...');
    console.log('Using region:', 'eu-west-1');
    
    try {
        // Test DynamoDB connection
        const command = new ScanCommand({
            TableName: 'users',
            Limit: 1
        });
        
        console.log('Attempting to connect to DynamoDB...');
        const response = await docClient.send(command);
        console.log('✅ DynamoDB Connection Successful!');
        console.log('Sample data:', JSON.stringify(response.Items, null, 2));

        // Test Lambda through API Gateway
        const apiUrl = 'https://nmdhwi6sek.execute-api.eu-west-1.amazonaws.com/prod/api/health';
        const response2 = await fetch(apiUrl, {
            headers: {
                'Content-Type': 'application/json',
                'Origin': 'http://backend-dydb-app-2025.s3-website-eu-west-1.amazonaws.com'
            }
        });

        const data = await response2.json();
        console.log('✅ Lambda Connection Successful!');
        console.log('Lambda response:', JSON.stringify(data, null, 2));

    } catch (error) {
        console.error('❌ Connection Failed!');
        console.error('Error details:', {
            message: error.message,
            code: error.code,
            name: error.name
        });
    }
}

testLambdaConnection(); 