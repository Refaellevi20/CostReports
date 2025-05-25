require('dotenv').config();
const { 
    APIGatewayClient, 
    CreateRestApiCommand,
    CreateResourceCommand,
    PutMethodCommand,
    PutIntegrationCommand,
    CreateDeploymentCommand,
    PutMethodResponseCommand,
    PutIntegrationResponseCommand,
    GetRestApisCommand,
    GetResourcesCommand
} = require('@aws-sdk/client-api-gateway');

const apigatewayClient = new APIGatewayClient({
    region: process.env.AWS_REGION,
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
    }
});

async function updateMethodResponse(apiId, apiResourceId) {
    try {
        await apigatewayClient.send(new PutMethodResponseCommand({
            restApiId: apiId,
            resourceId: apiResourceId,
            httpMethod: 'OPTIONS',
            statusCode: '200',
            responseParameters: {
                'method.response.header.Access-Control-Allow-Origin': true,
                'method.response.header.Access-Control-Allow-Methods': true,
                'method.response.header.Access-Control-Allow-Headers': true,
                'method.response.header.Access-Control-Allow-Credentials': true
            }
        }));
    } catch (error) {
        if (!error.message.includes('Response already exists')) {
            throw error;
        }
        console.log('Method response already exists, continuing...');
    }
}

async function updateIntegrationResponse(apiId, apiResourceId) {
    try {
        await apigatewayClient.send(new PutIntegrationResponseCommand({
            restApiId: apiId,
            resourceId: apiResourceId,
            httpMethod: 'OPTIONS',
            statusCode: '200',
            responseParameters: {
                'method.response.header.Access-Control-Allow-Origin': "'http://backend-dydb-app-2025.s3-website-eu-west-1.amazonaws.com'",
                'method.response.header.Access-Control-Allow-Methods': "'GET,POST,OPTIONS'",
                'method.response.header.Access-Control-Allow-Headers': "'Content-Type,Authorization'",
                'method.response.header.Access-Control-Allow-Credentials': "'true'"
            }
        }));
    } catch (error) {
        if (!error.message.includes('Response already exists')) {
            throw error;
        }
        console.log('Integration response already exists, continuing...');
    }
}

async function createApiGateway() {
    try {
        // Check if API already exists
        const existingApis = await apigatewayClient.send(new GetRestApisCommand({}));
        const existingApi = existingApis.items?.find(api => api.name === 'CustomerAPI');
        
        let apiId;
        if (existingApi) {
            console.log('API already exists, using existing API:', existingApi.id);
            apiId = existingApi.id;
        } else {
            // Create new API
            const createApiResponse = await apigatewayClient.send(new CreateRestApiCommand({
                name: 'CustomerAPI',
                description: 'API for customer management',
                endpointConfiguration: {
                    types: ['REGIONAL']
                }
            }));
            apiId = createApiResponse.id;
            console.log('API created successfully:', apiId);
        }

        // Get resources to find root resource ID and check for existing /api resource
        const resources = await apigatewayClient.send(new GetResourcesCommand({
            restApiId: apiId
        }));
        const rootResource = resources.items.find(r => r.path === '/');
        const apiResource = resources.items.find(r => r.path === '/api');

        let apiResourceId;
        if (apiResource) {
            console.log('API resource already exists, using existing resource:', apiResource.id);
            apiResourceId = apiResource.id;
        } else {
            // Create resource for /api
            const createResourceResponse = await apigatewayClient.send(new CreateResourceCommand({
                restApiId: apiId,
                parentId: rootResource.id,
                pathPart: 'api'
            }));
            apiResourceId = createResourceResponse.id;
            console.log('API resource created successfully:', apiResourceId);
        }

        // Create or update POST method
        try {
            await apigatewayClient.send(new PutMethodCommand({
                restApiId: apiId,
                resourceId: apiResourceId,
                httpMethod: 'POST',
                authorizationType: 'NONE'
            }));
            console.log('POST method created/updated');
        } catch (error) {
            console.log('POST method already exists, continuing...');
        }

        // Update Lambda integration
        await apigatewayClient.send(new PutIntegrationCommand({
            restApiId: apiId,
            resourceId: apiResourceId,
            httpMethod: 'POST',
            type: 'AWS_PROXY',
            integrationHttpMethod: 'POST',
            uri: `arn:aws:apigateway:${process.env.AWS_REGION}:lambda:path/2015-03-31/functions/arn:aws:lambda:${process.env.AWS_REGION}:${process.env.AWS_ACCOUNT_ID}:function:CustomerAPI/invocations`
        }));
        console.log('Lambda integration updated');

        // Update OPTIONS method for CORS
        try {
            await apigatewayClient.send(new PutMethodCommand({
                restApiId: apiId,
                resourceId: apiResourceId,
                httpMethod: 'OPTIONS',
                authorizationType: 'NONE'
            }));
            console.log('OPTIONS method created/updated');
        } catch (error) {
            console.log('OPTIONS method already exists, continuing...');
        }

        // Update OPTIONS integration
        await apigatewayClient.send(new PutIntegrationCommand({
            restApiId: apiId,
            resourceId: apiResourceId,
            httpMethod: 'OPTIONS',
            type: 'MOCK',
            requestTemplates: {
                'application/json': '{"statusCode": 200}'
            }
        }));

        // Update OPTIONS method response and integration response
        await updateMethodResponse(apiId, apiResourceId);
        await updateIntegrationResponse(apiId, apiResourceId);

        // Create new deployment
        await apigatewayClient.send(new CreateDeploymentCommand({
            restApiId: apiId,
            stageName: 'prod',
            description: 'Production deployment'
        }));

        const apiUrl = `https://${apiId}.execute-api.${process.env.AWS_REGION}.amazonaws.com/prod`;
        console.log('API Gateway updated and deployed successfully!');
        console.log('API Gateway URL:', apiUrl);

        // Print test curl command
        console.log('\nTest with:');
        console.log(`curl -X POST ${apiUrl}/api -H "Content-Type: application/json" -d '{"action": "test"}'`);
    } catch (error) {
        console.error('Error creating/updating API Gateway:', {
            message: error.message,
            code: error.Code,
            type: error.Type,
            requestId: error.$metadata?.requestId
        });
    }
}

createApiGateway(); 