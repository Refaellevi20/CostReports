require('dotenv').config();
const { 
    APIGatewayClient, 
    UpdateRestApiCommand,
    GetResourcesCommand,
    PutMethodCommand,
    PutIntegrationCommand,
    PutMethodResponseCommand,
    PutIntegrationResponseCommand
} = require('@aws-sdk/client-api-gateway');

const apigatewayClient = new APIGatewayClient({
    region: process.env.AWS_REGION || 'eu-west-1'
});

async function fixApiPermissions() {
    try {
        console.log('Starting API Gateway permissions update...');
        
        // Update the API Gateway CORS settings
        await apigatewayClient.send(new UpdateRestApiCommand({
            restApiId: 'nmdhwi6sek',
            patchOperations: [
                {
                    op: 'replace',
                    path: '/api/gateway/cors',
                    value: JSON.stringify({
                        allowOrigins: ['*'],  // For development. In production, specify your domain
                        allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
                        allowHeaders: ['Content-Type', 'Authorization', 'X-Amz-Date'],
                        allowCredentials: true
                    })
                }
            ]
        }));

        // Get all resources
        const resources = await apigatewayClient.send(new GetResourcesCommand({
            restApiId: 'nmdhwi6sek'
        }));

        // Find the /api resource
        const apiResource = resources.items.find(r => r.path === '/api');
        
        if (!apiResource) {
            throw new Error('API resource not found');
        }

        // Add OPTIONS method
        await apigatewayClient.send(new PutMethodCommand({
            restApiId: 'nmdhwi6sek',
            resourceId: apiResource.id,
            httpMethod: 'OPTIONS',
            authorizationType: 'NONE',
            apiKeyRequired: false
        }));

        // Add OPTIONS integration
        await apigatewayClient.send(new PutIntegrationCommand({
            restApiId: 'nmdhwi6sek',
            resourceId: apiResource.id,
            httpMethod: 'OPTIONS',
            type: 'MOCK',
            requestTemplates: {
                'application/json': '{"statusCode": 200}'
            }
        }));

        // Add method response
        await apigatewayClient.send(new PutMethodResponseCommand({
            restApiId: 'nmdhwi6sek',
            resourceId: apiResource.id,
            httpMethod: 'OPTIONS',
            statusCode: '200',
            responseParameters: {
                'method.response.header.Access-Control-Allow-Origin': true,
                'method.response.header.Access-Control-Allow-Methods': true,
                'method.response.header.Access-Control-Allow-Headers': true,
                'method.response.header.Access-Control-Allow-Credentials': true
            }
        }));

        // Add integration response
        await apigatewayClient.send(new PutIntegrationResponseCommand({
            restApiId: 'nmdhwi6sek',
            resourceId: apiResource.id,
            httpMethod: 'OPTIONS',
            statusCode: '200',
            responseParameters: {
                'method.response.header.Access-Control-Allow-Origin': "'*'",
                'method.response.header.Access-Control-Allow-Methods': "'GET,POST,PUT,DELETE,OPTIONS'",
                'method.response.header.Access-Control-Allow-Headers': "'Content-Type,Authorization,X-Amz-Date'",
                'method.response.header.Access-Control-Allow-Credentials': "'true'"
            }
        }));

        console.log('✅ API Gateway permissions updated successfully!');
        
    } catch (error) {
        console.error('❌ Error updating API Gateway:', error);
        throw error;
    }
}

fixApiPermissions()
    .then(() => console.log('Script completed successfully'))
    .catch(err => {
        console.error('Script failed:', err);
        process.exit(1);
    }); 