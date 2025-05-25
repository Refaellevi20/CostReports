require('dotenv').config();
const { 
    APIGatewayClient, 
    GetRestApisCommand,
    GetResourcesCommand 
} = require('@aws-sdk/client-api-gateway');

const apigatewayClient = new APIGatewayClient({
    region: process.env.AWS_REGION || 'eu-west-1',
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
    }
});

async function testApiGateway() {
    try {
        console.log('🔍 Starting API Gateway diagnostic...');
        
        // 1. Test AWS credentials
        console.log('\nChecking AWS credentials:');
        console.log('Access Key:', process.env.AWS_ACCESS_KEY_ID ? '✅ Present' : '❌ Missing');
        console.log('Secret Key:', process.env.AWS_SECRET_ACCESS_KEY ? '✅ Present' : '❌ Missing');
        console.log('Region:', process.env.AWS_REGION || 'eu-west-1');

        // 2. List all APIs
        console.log('\nFetching API list...');
        const apis = await apigatewayClient.send(new GetRestApisCommand({}));
        console.log('Found APIs:', apis.items.length);
        
        // Find our specific API
        const ourApi = apis.items.find(api => api.id === 'nmdhwi6sek');
        if (!ourApi) {
            throw new Error('API ID nmdhwi6sek not found!');
        }
        console.log('✅ Found our API:', ourApi.name);

        // 3. Get API resources
        console.log('\nFetching API resources...');
        const resources = await apigatewayClient.send(new GetResourcesCommand({
            restApiId: 'nmdhwi6sek'
        }));
        console.log('Resources found:', resources.items.length);
        resources.items.forEach(resource => {
            console.log(`- ${resource.path} (${resource.id})`);
        });

    } catch (error) {
        console.error('\n❌ Error during diagnostic:');
        console.error('Error Type:', error.name);
        console.error('Error Message:', error.message);
        
        if (error.message.includes('credentials')) {
            console.log('\n📋 To fix credentials:');
            console.log('1. Run these commands in PowerShell:');
            console.log('   $env:AWS_ACCESS_KEY_ID="your-access-key"');
            console.log('   $env:AWS_SECRET_ACCESS_KEY="your-secret-key"');
            console.log('   $env:AWS_REGION="eu-west-1"');
        }
        if (error.message.includes('not authorized')) {
            console.log('\n📋 To fix permissions:');
            console.log('1. Check IAM user permissions');
            console.log('2. Verify API Gateway policies');
        }
    }
}

testApiGateway()
    .then(() => console.log('\n✅ Diagnostic complete'))
    .catch(() => console.log('\n❌ Diagnostic failed')); 