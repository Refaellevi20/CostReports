require('dotenv').config();
const { 
    IAMClient, 
    CreateRoleCommand, 
    PutRolePolicyCommand 
} = require('@aws-sdk/client-iam');

const iamClient = new IAMClient({
    region: process.env.AWS_REGION,
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
    }
});

async function createLambdaRole() {
    try {
        // Create role
        const roleResponse = await iamClient.send(new CreateRoleCommand({
            RoleName: 'lambda-dynamodb-role',
            AssumeRolePolicyDocument: JSON.stringify({
                Version: '2012-10-17',
                Statement: [{
                    Effect: 'Allow',
                    Principal: {
                        Service: 'lambda.amazonaws.com'
                    },
                    Action: 'sts:AssumeRole'
                }]
            })
        }));

        // Add DynamoDB permissions
        const policyDocument = {
            Version: '2012-10-17',
            Statement: [{
                Effect: 'Allow',
                Action: [
                    'dynamodb:PutItem',
                    'dynamodb:Scan',
                    'dynamodb:Query'
                ],
                Resource: [
                    `arn:aws:dynamodb:${process.env.AWS_REGION}:*:table/customers`,
                    `arn:aws:dynamodb:${process.env.AWS_REGION}:*:table/users`
                ]
            }]
        };

        await iamClient.send(new PutRolePolicyCommand({
            RoleName: 'lambda-dynamodb-role',
            PolicyName: 'dynamodb-access',
            PolicyDocument: JSON.stringify(policyDocument)
        }));

        console.log('Role created:', roleResponse.Role.Arn);
    } catch (error) {
        console.error('Error creating role:', error);
    }
}

createLambdaRole(); 