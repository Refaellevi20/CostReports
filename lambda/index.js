const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, PutCommand, GetCommand, ScanCommand, QueryCommand } = require('@aws-sdk/lib-dynamodb');
const { v4: uuidv4 } = require('uuid');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { CostExplorerClient, GetCostAndUsageCommand } = require('@aws-sdk/client-cost-explorer');

const client = new DynamoDBClient({ region: process.env.AWS_REGION });
const docClient = DynamoDBDocumentClient.from(client);
const costExplorerClient = new CostExplorerClient({ region: process.env.AWS_REGION });

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

exports.handler = async (event) => {
    console.log('Event:', JSON.stringify(event, null, 2));
    
    const headers = {
        'Access-Control-Allow-Origin': 'http://backend-dydb-app-2025.s3-website-eu-west-1.amazonaws.com',
        'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type,Authorization',
        'Access-Control-Allow-Credentials': 'true'
    };

    try {
        const { path, method } = event;

        // Add health check endpoint
        if (path === '/api/health' && method === 'GET') {
            return {
                statusCode: 200,
                headers,
                body: JSON.stringify({
                    status: 'healthy',
                    timestamp: new Date().toISOString()
                })
            };
        }

        // Handle OPTIONS requests (CORS preflight)
        if (method === 'OPTIONS') {
            return {
                statusCode: 200,
                headers,
                body: ''
            };
        }

        // Auth Routes
        if (path === '/api/auth/signup' && method === 'POST') {
            const { username, password, fullname } = JSON.parse(event.body);
            const hashedPassword = await bcrypt.hash(password, 10);
            const userId = uuidv4();

            await docClient.send(new PutCommand({
                TableName: 'users',
                Item: {
                    userId,
                    username,
                    password: hashedPassword,
                    fullname,
                    createdAt: new Date().toISOString()
                }
            }));

            const token = jwt.sign({ userId, username }, JWT_SECRET);

            return {
                statusCode: 200,
                headers,
                body: JSON.stringify({
                    token,
                    user: { userId, username, fullname }
                })
            };
        }

        if (path === '/api/auth/login' && method === 'POST') {
            const { username, password } = JSON.parse(event.body);

            const response = await docClient.send(new ScanCommand({
                TableName: 'users',
                FilterExpression: 'username = :username',
                ExpressionAttributeValues: {
                    ':username': username
                }
            }));

            const user = response.Items[0];
            if (!user || !(await bcrypt.compare(password, user.password))) {
                return {
                    statusCode: 401,
                    headers,
                    body: JSON.stringify({ error: 'Invalid credentials' })
                };
            }

            const token = jwt.sign({ userId: user.userId, username }, JWT_SECRET);

            return {
                statusCode: 200,
                headers,
                body: JSON.stringify({
                    token,
                    user: {
                        userId: user.userId,
                        username: user.username,
                        fullname: user.fullname
                    }
                })
            };
        }

        // Customer Routes
        if (path === '/api/customers' && method === 'POST') {
            const body = JSON.parse(event.body);
            const customerId = uuidv4();

            await docClient.send(new PutCommand({
                TableName: 'customers',
                Item: {
                    customerId,
                    name: body.name,
                    createdAt: new Date().toISOString()
                }
            }));

            return {
                statusCode: 200,
                headers,
                body: JSON.stringify({
                    message: 'Customer registered successfully',
                    customerId
                })
            };
        }

        // User endpoints
        if (path === '/api/users' && method === 'POST') {
            const user = JSON.parse(event.body);
            await docClient.send(new PutCommand({
                TableName: 'Users',
                Item: {
                    userId: uuidv4(),
                    email: user.email,
                    name: user.name,
                    createdAt: new Date().toISOString()
                }
            }));

            return {
                statusCode: 201,
                headers,
                body: JSON.stringify({ message: 'User created successfully' })
            };
        }

        // Cost reports endpoints
        if (path === '/api/costs' && method === 'GET') {
            const userId = event.queryStringParameters?.userId;
            
            // Get dates for last 7 days
            const endDate = new Date().toISOString().split('T')[0];
            const startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

            // Get costs from Cost Explorer
            const costCommand = new GetCostAndUsageCommand({
                TimePeriod: {
                    Start: startDate,
                    End: endDate
                },
                Granularity: 'DAILY',
                Metrics: ['UnblendedCost']
            });

            const costData = await costExplorerClient.send(costCommand);

            // Save to DynamoDB with user association
            const timestamp = new Date().toISOString();
            await docClient.send(new PutCommand({
                TableName: 'CostReports',
                Item: {
                    id: `cost_${timestamp}`,
                    userId: userId || 'system',  // Associate with user if provided
                    timestamp,
                    startDate,
                    endDate,
                    costData: costData.ResultsByTime
                }
            }));

            // Query reports for specific user if provided
            let reports;
            if (userId) {
                const { Items } = await docClient.send(new QueryCommand({
                    TableName: 'CostReports',
                    IndexName: 'UserReportsIndex',
                    KeyConditionExpression: 'userId = :userId',
                    ExpressionAttributeValues: {
                        ':userId': userId
                    },
                    ScanIndexForward: false,  // Latest first
                    Limit: 7
                }));
                reports = Items;
            } else {
                reports = costData.ResultsByTime;
            }

            return {
                statusCode: 200,
                headers,
                body: JSON.stringify({
                    message: 'Cost data retrieved and saved successfully',
                    data: reports
                })
            };
        }

        return {
            statusCode: 404,
            headers,
            body: JSON.stringify({ error: 'Not Found' })
        };

    } catch (error) {
        console.error('Error:', error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ error: 'Internal Server Error' })
        };
    }
}; 