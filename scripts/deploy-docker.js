require('dotenv').config();
const { execSync } = require('child_process');

async function deployToS3() {
    try {
        console.log('Starting S3 deployment...');
        
        // Run the deployment commands
        execSync('npm run s3:setup', { stdio: 'inherit' });
        
        console.log('Deployment complete!');
    } catch (error) {
        console.error('Deployment failed:', error);
        process.exit(1);
    }
}

deployToS3(); 