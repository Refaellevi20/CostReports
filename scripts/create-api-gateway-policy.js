require('dotenv').config();
const { 
    IAMClient, 
    PutUserPolicyCommand 
} = require('@aws-sdk/client-iam');

const iamClient = new IAMClient({
    region: process.env.AWS_REGION,
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
    }
});

async function createApiGatewayPolicy() {
    try {
        const policyDocument = {
            Version: '2012-10-17',
            Statement: [{
                Effect: 'Allow',
                Action: [
                    'apigateway:POST',
                    'apigateway:GET',
                    'apigateway:PUT',
                    'apigateway:DELETE',
                    'apigateway:PATCH'
                ],
                Resource: `arn:aws:apigateway:${process.env.AWS_REGION}::/restapis/*`
            }]
        };

        await iamClient.send(new PutUserPolicyCommand({
            UserName: 'dynamo-app-user',
            PolicyName: 'api-gateway-access',
            PolicyDocument: JSON.stringify(policyDocument)
        }));

        console.log('API Gateway policy created successfully!');
    } catch (error) {
        console.error('Error creating API Gateway policy:', error);
    }
}

createApiGatewayPolicy(); 