require('dotenv').config();
const { LambdaClient, GetFunctionCommand } = require('@aws-sdk/client-lambda');

const lambdaClient = new LambdaClient({
    region: process.env.AWS_REGION || 'eu-west-1',
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
    }
});

async function verifyLambda() {
    try {
        const command = new GetFunctionCommand({
            FunctionName: 'CustomerAPI'
        });
        
        console.log('Checking Lambda function...');
        const response = await lambdaClient.send(command);
        console.log('✅ Lambda function exists!');
        console.log('Function URL:', response.Configuration.FunctionUrl);
        console.log('Last modified:', response.Configuration.LastModified);
        console.log('Runtime:', response.Configuration.Runtime);
    } catch (error) {
        console.error('❌ Lambda verification failed:', error.message);
    }
}

verifyLambda(); 