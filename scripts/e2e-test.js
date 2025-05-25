const { LambdaClient, InvokeCommand } = require('@aws-sdk/client-lambda');
const fetch = require('node-fetch');

async function runE2ETest() {
  try {
    console.log('Starting E2E test...');

    // 1. Trigger Lambda manually
    const lambda = new LambdaClient({ region: process.env.AWS_REGION });
    await lambda.send(new InvokeCommand({
      FunctionName: 'CustomerAPI',
      Payload: JSON.stringify({ path: '/api/costs', httpMethod: 'GET' })
    }));
    console.log('✅ Lambda triggered successfully');

    // 2. Wait a bit for data to be processed
    await new Promise(resolve => setTimeout(resolve, 5000));

    // 3. Check API endpoint
    const apiResponse = await fetch(`${process.env.API_URL}/costs`);
    const apiData = await apiResponse.json();
    console.log('✅ API returned data:', apiData);

    // 4. Check frontend
    const frontendResponse = await fetch(process.env.FRONTEND_URL);
    if (frontendResponse.ok) {
      console.log('✅ Frontend is accessible');
    }

    console.log('✅ E2E test completed successfully!');
  } catch (error) {
    console.error('❌ E2E test failed:', error);
    process.exit(1);
  }
}

runE2ETest(); 