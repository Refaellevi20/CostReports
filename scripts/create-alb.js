require('dotenv').config();
const { 
    ElasticLoadBalancingV2Client, 
    CreateLoadBalancerCommand,
    CreateTargetGroupCommand,
    CreateListenerCommand,
    RegisterTargetsCommand
} = require('@aws-sdk/client-elastic-load-balancing-v2');

const elbv2Client = new ElasticLoadBalancingV2Client({
    region: process.env.AWS_REGION,
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
    }
});

async function createALB() {
    try {
        // Create ALB
        const createLBResponse = await elbv2Client.send(new CreateLoadBalancerCommand({
            Name: 'customer-app-alb',
            Subnets: ['subnet-xxxxx', 'subnet-yyyyy'], // Replace with your subnet IDs
            SecurityGroups: ['sg-zzzzz'], // Replace with your security group ID
            Scheme: 'internet-facing',
            Type: 'application'
        }));
        
        const albArn = createLBResponse.LoadBalancers[0].LoadBalancerArn;
        console.log('ALB created:', albArn);

        // Create Target Group for API
        const createTGResponse = await elbv2Client.send(new CreateTargetGroupCommand({
            Name: 'customer-api-tg',
            Protocol: 'HTTP',
            Port: 3030,
            VpcId: 'vpc-xxxxx', // Replace with your VPC ID
            HealthCheckPath: '/api/health',
            TargetType: 'instance'
        }));
        
        const tgArn = createTGResponse.TargetGroups[0].TargetGroupArn;
        console.log('Target Group created:', tgArn);

        // Register EC2 instance with Target Group
        await elbv2Client.send(new RegisterTargetsCommand({
            TargetGroupArn: tgArn,
            Targets: [{
                Id: 'i-xxxxx', // Replace with your EC2 instance ID
                Port: 3030
            }]
        }));

        // Create Listener
        await elbv2Client.send(new CreateListenerCommand({
            LoadBalancerArn: albArn,
            Protocol: 'HTTP',
            Port: 80,
            DefaultActions: [{
                Type: 'forward',
                TargetGroupArn: tgArn
            }]
        }));

        console.log('ALB setup complete!');
    } catch (error) {
        console.error('Error setting up ALB:', error);
    }
}

createALB(); 