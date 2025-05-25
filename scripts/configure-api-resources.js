const { 
    APIGatewayClient, 
    PutMethodCommand,
    PutIntegrationCommand,
    PutMethodResponseCommand,
    PutIntegrationResponseCommand 
} = require('@aws-sdk/client-api-gateway');

const apigatewayClient = new APIGatewayClient({
    region: process.env.AWS_REGION || 'eu-west-1'
});

async function configureApiResources() {
    try {
        // Configure /api resource (m5aw94)
        await configureResource('m5aw94', 'GET');
        await configureResource('m5aw94', 'OPTIONS');
        
        // Configure /auth resource (311v9v)
        await configureResource('311v9v', 'POST');
        await configureResource('311v9v', 'OPTIONS');
        
        console.log('✅ API resources configured successfully!');
    } catch (error) {
        console.error('❌ Error configuring resources:', error);
    }
}

async function configureResource(resourceId, method) {
    const restApiId = 'nmdhwi6sek';
    
    // Add method
    await apigatewayClient.send(new PutMethodCommand({
        restApiId,
        resourceId,
        httpMethod: method,
        authorizationType: 'NONE',
        apiKeyRequired: false
    }));

    // Add integration
    if (method !== 'OPTIONS') {
        await apigatewayClient.send(new PutIntegrationCommand({
            restApiId,
            resourceId,
            httpMethod: method,
            type: 'AWS_PROXY',
            integrationHttpMethod: 'POST',
            uri: `arn:aws:apigateway:${process.env.AWS_REGION}:lambda:path/2015-03-31/functions/${process.env.LAMBDA_ARN}/invocations`
        }));
    } else {
        // OPTIONS method for CORS
        await apigatewayClient.send(new PutIntegrationCommand({
            restApiId,
            resourceId,
            httpMethod: 'OPTIONS',
            type: 'MOCK',
            requestTemplates: {
                'application/json': '{"statusCode": 200}'
            }
        }));
    }

    // Add method response
    await apigatewayClient.send(new PutMethodResponseCommand({
        restApiId,
        resourceId,
        httpMethod: method,
        statusCode: '200',
        responseParameters: {
            'method.response.header.Access-Control-Allow-Origin': true,
            'method.response.header.Access-Control-Allow-Methods': true,
            'method.response.header.Access-Control-Allow-Headers': true
        }
    }));

    // Add integration response
    await apigatewayClient.send(new PutIntegrationResponseCommand({
        restApiId,
        resourceId,
        httpMethod: method,
        statusCode: '200',
        responseParameters: {
            'method.response.header.Access-Control-Allow-Origin': "'http://backend-dydb-app-2025.s3-website-eu-west-1.amazonaws.com'",
            'method.response.header.Access-Control-Allow-Methods': "'GET,POST,PUT,DELETE,OPTIONS'",
            'method.response.header.Access-Control-Allow-Headers': "'Content-Type,Authorization'"
        }
    }));
}

configureApiResources(); 