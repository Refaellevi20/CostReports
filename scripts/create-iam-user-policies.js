require('dotenv').config();
const { 
    IAMClient, 
    AttachUserPolicyCommand 
} = require('@aws-sdk/client-iam');

const iamClient = new IAMClient({
    region: process.env.AWS_REGION,
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
    }
});

async function attachPolicies() {
    try {
        // Attach existing policies to user
        const policies = [
            'arn:aws:iam::aws:policy/AmazonAPIGatewayAdministrator',
            'arn:aws:iam::aws:policy/AWSLambda_FullAccess',
            'arn:aws:iam::aws:policy/AmazonDynamoDBFullAccess'
        ];

        for (const policyArn of policies) {
            try {
                await iamClient.send(new AttachUserPolicyCommand({
                    UserName: 'dynamo-app-user',
                    PolicyArn: policyArn
                }));
                console.log(`Successfully attached policy: ${policyArn}`);
            } catch (attachError) {
                if (attachError.name === 'PolicyNotAttachableException') {
                    console.log(`Policy ${policyArn} is already attached`);
                } else {
                    console.error(`Error attaching policy ${policyArn}:`, attachError);
                }
            }
        }

        console.log('All available policies attached successfully!');
    } catch (error) {
        console.error('Error attaching policies:', error);
    }
}

attachPolicies(); 