require('dotenv').config()
const { DynamoDBClient } = require('@aws-sdk/client-dynamodb')
const { DynamoDBDocumentClient, PutCommand, GetCommand } = require('@aws-sdk/lib-dynamodb')

const client = new DynamoDBClient({
    region: process.env.AWS_REGION,
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
    }
})

const docClient = DynamoDBDocumentClient.from(client)

async function testConnection() {
    try {
        // Create the host user
        const hostUser = {
            id: 'u101',  // Using this as the primary key for DynamoDB
            _id: 'u101', // Keeping this for compatibility with your app
            fullname: 'shukiy Host',
            imgUrl: 'https://robohash.org/shukiyhost?set=set4',
            username: 'host',
            password: 'secret',
            isOwner: true,
            likedStays: [{ _id: '622f337a75c7d36e498aaaf8' }]
        }

        console.log('\nAttempting to write host user:', hostUser)
        await docClient.send(new PutCommand({
            TableName: 'users',
            Item: hostUser
        }))
        console.log('Write successful!')

        // Verify the user was added
        console.log('\nAttempting to read host user...')
        const response = await docClient.send(new GetCommand({
            TableName: 'users',
            Key: {
                id: 'u101'
            }
        }))
        console.log('Read successful! User data:', response.Item)

    } catch (error) {
        console.error('\nError occurred:', error)
    }
}

testConnection() 