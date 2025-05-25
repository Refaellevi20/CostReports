require('dotenv').config();
const { 
    APIGatewayClient, 
    UpdateRestApiCommand,
    GetRestApisCommand,
    CreateDeploymentCommand
} = require('@aws-sdk/client-api-gateway');

const apigatewayClient = new APIGatewayClient({
    region: process.env.AWS_REGION,
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
    }
});

async function updateApiPermissions() {
    try {
        // Get your API ID
        const apis = await apigatewayClient.send(new GetRestApisCommand({}));
        const api = apis.items.find(api => api.name === 'CustomerAPI');
        
        if (!api) {
            console.error('API not found');
            return;
        }

        console.log('Found API:', api.name, 'with ID:', api.id);

        // Update API Gateway settings with correct patch paths
        await apigatewayClient.send(new UpdateRestApiCommand({
            restApiId: api.id,
            patchOperations: [
                {
                    op: 'replace',
                    path: '/gateway/cors/origins',
                    value: "'http://backend-dydb-app-2025.s3-website-eu-west-1.amazonaws.com'"
                },
                {
                    op: 'replace',
                    path: '/gateway/cors/methods',
                    value: "'GET,POST,PUT,DELETE,OPTIONS'"
                },
                {
                    op: 'replace',
                    path: '/gateway/cors/headers',
                    value: "'Content-Type,Authorization'"
                },
                {
                    op: 'replace',
                    path: '/gateway/cors/allowCredentials',
                    value: "true"
                }
            ]
        }));

        // Create new deployment
        await apigatewayClient.send(new CreateDeploymentCommand({
            restApiId: api.id,
            stageName: 'prod',
            description: 'Updated CORS settings'
        }));

        console.log('API Gateway permissions updated successfully');
    } catch (error) {
        console.error('Error updating API Gateway:', error.message);
        if (error.$metadata) {
            console.error('Error metadata:', JSON.stringify(error.$metadata, null, 2));
        }
    }
}

updateApiPermissions(); 