require('dotenv').config();
const { DynamoDBClient, CreateTableCommand } = require('@aws-sdk/client-dynamodb');

// Set default region if not provided in environment
const AWS_REGION = process.env.AWS_REGION || 'us-east-1';

const client = new DynamoDBClient({
    region: AWS_REGION,
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID || 'YOUR_ACCESS_KEY',
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || 'YOUR_SECRET_KEY'
    }
});

async function createCustomerTable() {
    try {
        console.log('Creating table in region:', AWS_REGION);
        
        const command = new CreateTableCommand({
            TableName: 'customers',
            AttributeDefinitions: [
                { AttributeName: 'customerId', AttributeType: 'S' }
            ],
            KeySchema: [
                { AttributeName: 'customerId', KeyType: 'HASH' }
            ],
            ProvisionedThroughput: {
                ReadCapacityUnits: 5,
                WriteCapacityUnits: 5
            }
        });

        const response = await client.send(command);
        console.log('Customer table created successfully:', response);
    } catch (error) {
        if (error.name === 'ResourceInUseException') {
            console.log('Table already exists');
        } else {
            console.error('Error creating table:', error);
        }
    }
}

createCustomerTable(); 