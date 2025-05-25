const { DynamoDBClient } = require('@aws-sdk/client-dynamodb')
const { DynamoDBDocumentClient, GetCommand, PutCommand, QueryCommand, ScanCommand } = require('@aws-sdk/lib-dynamodb')
const logger = require('./logger.service')
require('dotenv').config()

const client = new DynamoDBClient({
    region: process.env.AWS_REGION,
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
    }
})

const docClient = DynamoDBDocumentClient.from(client)

async function connect() {
    try {
        console.log('AWS Region:', process.env.AWS_REGION)
        // Test connection
        const command = new ScanCommand({
            TableName: 'users',
            Limit: 1
        })
        await docClient.send(command)
        logger.info('Connected to DynamoDB successfully')
    } catch (err) {
        logger.error('Failed to connect to DynamoDB:', err)
        throw err
    }
}

async function getCollection(collectionName) {
    try {
        const tableName = 'users'
        return {
            findOne: async (query) => {
                try {
                    if (query.Key) {
                        // Direct key lookup
                        const command = new GetCommand({
                            TableName: 'users',
                            Key: query.Key
                        })
                        const response = await docClient.send(command)
                        return response.Item
                    } else if (query.FilterExpression) {
                        // Scan with filter
                        const command = new ScanCommand({
                            TableName: 'users',
                            FilterExpression: query.FilterExpression,
                            ExpressionAttributeValues: query.ExpressionAttributeValues
                        })
                        const response = await docClient.send(command)
                        return response.Items?.[0]
                    }
                } catch (err) {
                    logger.error('Failed to find one:', err)
                    throw err
                }
            },
            find: async () => {
                try {
                    const command = new ScanCommand({
                        TableName: 'users'
                    })
                    const response = await docClient.send(command)
                    return response.Items
                } catch (err) {
                    logger.error('Failed to find:', err)
                    throw err
                }
            },
            insertOne: async (doc) => {
                try {
                    if (!doc.user456) {
                        throw new Error('Missing required primary key user456')
                    }
                    const command = new PutCommand({
                        TableName: 'users',
                        Item: doc,
                        ConditionExpression: 'attribute_not_exists(user456)'
                    })
                    await docClient.send(command)
                    return doc
                } catch (err) {
                    logger.error('Failed to insert:', err)
                    throw err
                }
            },
            updateOne: async (query, update) => {
                try {
                    const command = new PutCommand({
                        TableName: 'users',
                        Item: {
                            user456: query.id || query._id,
                            ...update.$set
                        }
                    })
                    await docClient.send(command)
                    return update.$set
                } catch (err) {
                    logger.error('Failed to update:', err)
                    throw err
                }
            }
        }
    } catch (err) {
        logger.error('Failed to get collection:', err)
        throw err
    }
}



module.exports = {
    connect,
    getCollection
} 