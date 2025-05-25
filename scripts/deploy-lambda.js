const fs = require('fs');
const path = require('path');
const { 
    LambdaClient, 
    CreateFunctionCommand,
    UpdateFunctionCodeCommand 
} = require('@aws-sdk/client-lambda');
const { execSync, exec } = require('child_process');
const archiver = require('archiver');
const { promisify } = require('util');
const execAsync = promisify(exec);

// Manually load .env file
const envPath = path.join(__dirname, '..', '.env');
const envContent = fs.readFileSync(envPath, 'utf8');
const envVars = {};

envContent.split('\n').forEach(line => {
    if (line && !line.startsWith('#')) {
        const [key, value] = line.split('=');
        if (key && value) {
            envVars[key.trim()] = value.trim();
        }
    }
});

// Debug logging
console.log('Full AWS Configuration:');
console.log('Region:', envVars.AWS_REGION);
console.log('Access Key ID:', envVars.AWS_ACCESS_KEY_ID);
console.log('Secret Key length:', envVars.AWS_SECRET_ACCESS_KEY?.length || 0);

const lambdaClient = new LambdaClient({
    region: envVars.AWS_REGION,
    credentials: {
        accessKeyId: envVars.AWS_ACCESS_KEY_ID,
        secretAccessKey: envVars.AWS_SECRET_ACCESS_KEY
    }
});

async function packageLambda() {
    // Cleanup
    if (fs.existsSync('lambda-package')) {
        fs.rmSync('lambda-package', { recursive: true, force: true });
    }
    if (fs.existsSync('function.zip')) {
        fs.unlinkSync('function.zip');
    }
    
    // Create temp directory
    fs.mkdirSync('lambda-package');
    
    // Copy Lambda files
    fs.copyFileSync('lambda/index.js', 'lambda-package/index.js');
    
    // Create package.json
    fs.writeFileSync('lambda-package/package.json', JSON.stringify({
        "name": "lambda-function",
        "version": "1.0.0",
        "dependencies": {
            "@aws-sdk/client-dynamodb": "^3.0.0",
            "@aws-sdk/lib-dynamodb": "^3.0.0",
            "uuid": "^9.0.0",
            "jsonwebtoken": "^9.0.0",
            "bcryptjs": "^2.4.3"  // Using bcryptjs instead of bcrypt
        }
    }));
    
    // Install dependencies
    console.log('Installing dependencies...');
    execSync('npm install', {
        cwd: 'lambda-package',
        stdio: 'inherit'
    });

    // Create ZIP
    return new Promise((resolve, reject) => {
        const output = fs.createWriteStream('function.zip');
        const archive = archiver('zip');
        
        output.on('close', () => {
            try {
                const zipContent = fs.readFileSync('function.zip');
                resolve(zipContent);
            } catch (err) {
                reject(err);
            }
        });
        
        archive.on('error', reject);
        archive.pipe(output);
        archive.directory('lambda-package/', false);
        archive.finalize();
    });
}

async function deployLambda() {
    try {
        await packageLambda();
        
        const zipFile = fs.readFileSync('function.zip');
        
        try {
            // Try to update existing function
            console.log('Updating existing Lambda function...');
            await lambdaClient.send(new UpdateFunctionCodeCommand({
                FunctionName: 'CustomerAPI',
                ZipFile: zipFile
            }));
        } catch (updateError) {
            if (updateError.name === 'ResourceNotFoundException') {
                // Function doesn't exist, create it
                console.log('Creating new Lambda function...');
                await lambdaClient.send(new CreateFunctionCommand({
                    FunctionName: 'CustomerAPI',
                    Runtime: 'nodejs18.x',
                    Role: `arn:aws:iam::${process.env.AWS_ACCOUNT_ID}:role/lambda-dynamodb-role`,
                    Handler: 'index.handler',
                    Code: {
                        ZipFile: zipFile
                    }
                }));
            } else {
                throw updateError;
            }
        }
        
        console.log('✅ Lambda deployment successful!');
    } catch (error) {
        console.error('Deployment failed:', error);
        throw error;
    }
}

deployLambda(); 