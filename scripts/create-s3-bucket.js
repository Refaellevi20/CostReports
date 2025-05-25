require('dotenv').config();
const { 
    S3Client, 
    CreateBucketCommand, 
    PutBucketWebsiteCommand, 
    PutBucketPolicyCommand,
    HeadBucketCommand 
} = require('@aws-sdk/client-s3');

const s3Client = new S3Client({
    region: process.env.AWS_REGION,
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
    }
});

const BUCKET_NAME = 'backend-dydb-app-2025'; // Using your existing bucket name

async function createS3Bucket() {
    try {
        // Check if bucket exists
        try {
            await s3Client.send(new HeadBucketCommand({ Bucket: BUCKET_NAME }));
            console.log(`Bucket ${BUCKET_NAME} already exists, configuring...`);
        } catch (error) {
            if (error.$metadata?.httpStatusCode === 404) {
                // Bucket doesn't exist, create it
                await s3Client.send(new CreateBucketCommand({
                    Bucket: BUCKET_NAME,
                    CreateBucketConfiguration: {
                        LocationConstraint: process.env.AWS_REGION
                    }
                }));
                console.log(`Bucket ${BUCKET_NAME} created successfully!`);
            } else {
                throw error;
            }
        }

        // Enable static website hosting
        await s3Client.send(new PutBucketWebsiteCommand({
            Bucket: BUCKET_NAME,
            WebsiteConfiguration: {
                IndexDocument: { Suffix: 'index.html' },
                ErrorDocument: { Key: 'index.html' }
            }
        }));
        console.log('Static website hosting configured!');

        // Set bucket policy for ALB access
        const bucketPolicy = {
            Version: '2012-10-17',
            Statement: [{
                Sid: 'PublicReadGetObject',
                Effect: 'Allow',
                Principal: '*',
                Action: 's3:GetObject',
                Resource: `arn:aws:s3:::${BUCKET_NAME}/*`
            }]
        };

        await s3Client.send(new PutBucketPolicyCommand({
            Bucket: BUCKET_NAME,
            Policy: JSON.stringify(bucketPolicy)
        }));
        console.log('Bucket policy updated!');

        console.log(`Bucket ${BUCKET_NAME} configuration complete!`);
        console.log(`Website URL: http://${BUCKET_NAME}.s3-website.${process.env.AWS_REGION}.amazonaws.com`);
    } catch (error) {
        console.error('Error:', error);
    }
}

createS3Bucket(); 