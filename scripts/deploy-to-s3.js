require('dotenv').config();
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const fs = require('fs').promises;
const path = require('path');
const mime = require('mime-types'); // You'll need to install this: npm install mime-types

const s3Client = new S3Client({
    region: process.env.AWS_REGION,
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
    }
});

const BUCKET_NAME = 'backend-dydb-app-2025';

async function uploadFile(filePath, bucketPath) {
    const fileContent = await fs.readFile(filePath);
    const contentType = mime.lookup(filePath) || 'application/octet-stream';

    await s3Client.send(new PutObjectCommand({
        Bucket: BUCKET_NAME,
        Key: bucketPath,
        Body: fileContent,
        ContentType: contentType
    }));
    
    console.log(`Uploaded: ${bucketPath} (${contentType})`);
}

async function getAllFiles(dir) {
    const files = await fs.readdir(dir);
    const fileList = [];
    
    for (const file of files) {
        const filePath = path.join(dir, file);
        const stat = await fs.stat(filePath);
        
        if (stat.isDirectory()) {
            // If it's a directory, recurse into it
            const subFiles = await getAllFiles(filePath);
            fileList.push(...subFiles);
        } else {
            // If it's a file, add it to the list
            fileList.push(filePath);
        }
    }
    
    return fileList;
}

async function deployToS3() {
    try {
        console.log('Starting deployment to S3...');
        
        // Get all files from public directory and assets
        const publicFiles = await getAllFiles('./public');
        console.log('Found files:', publicFiles);
        
        // Upload each file
        for (const filePath of publicFiles) {
            // Convert local path to S3 path
            const relativePath = path.relative('./public', filePath);
            // Replace Windows backslashes with forward slashes if needed
            const s3Path = relativePath.replace(/\\/g, '/');
            
            await uploadFile(filePath, s3Path);
        }
        
        console.log('Deployment complete!');
        console.log(`Website URL: http://${BUCKET_NAME}.s3-website.${process.env.AWS_REGION}.amazonaws.com`);
    } catch (error) {
        console.error('Deployment failed:', error);
        process.exit(1);
    }
}

deployToS3(); 