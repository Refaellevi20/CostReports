require('dotenv').config();
const { 
    APIGatewayClient, 
    UpdateRestApiCommand,
    PutMethodCommand,
    PutIntegrationCommand 
} = require('@aws-sdk/client-api-gateway');

const apigatewayClient = new APIGatewayClient({
    region: process.env.AWS_REGION,
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
    }
});

async function updateApiGateway() {
    try {
        // Add health check endpoint
        await apigatewayClient.send(new PutMethodCommand({
            restApiId: 'nmdhwi6sek', // Your API ID
            resourceId: 'YOUR_RESOURCE_ID', // Get this from AWS Console
            httpMethod: 'GET',
            authorizationType: 'NONE',
            apiKeyRequired: false
        }));

        // Add Lambda integration
        await apigatewayClient.send(new PutIntegrationCommand({
            restApiId: 'nmdhwi6sek',
            resourceId: 'YOUR_RESOURCE_ID',
            httpMethod: 'GET',
            type: 'AWS_PROXY',
            integrationHttpMethod: 'POST',
            uri: `arn:aws:apigateway:${process.env.AWS_REGION}:lambda:path/2015-03-31/functions/arn:aws:lambda:${process.env.AWS_REGION}:${process.env.AWS_ACCOUNT_ID}:function:CustomerAPI/invocations`
        }));

        console.log('API Gateway updated successfully');
    } catch (error) {
        console.error('Error updating API Gateway:', error);
    }
}

updateApiGateway(); 