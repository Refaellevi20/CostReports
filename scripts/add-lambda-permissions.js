require('dotenv').config();
const { IAMClient, AttachUserPolicyCommand } = require('@aws-sdk/client-iam');

const iamClient = new IAMClient({
    region: process.env.AWS_REGION,
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
    }
});

async function addLambdaPermissions() {
    try {
        // Add AWSLambdaFullAccess policy
        await iamClient.send(new AttachUserPolicyCommand({
            UserName: 'raflevi-aws',  // Your IAM username
            PolicyArn: 'arn:aws:iam::aws:policy/AWSLambdaFullAccess'
        }));

        console.log('✅ Lambda permissions added successfully!');
    } catch (error) {
        console.error('Error adding permissions:', error);
    }
}

addLambdaPermissions(); 