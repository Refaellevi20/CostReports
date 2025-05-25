const bcrypt = require('bcrypt')
const jwt = require('jsonwebtoken')
const User = require('../models/user')

const saltRounds = 10
const secret = 'your-secret-key' // In production, use environment variable

async function login(username, password) {
    try {
        const user = await User.findOne({ username })
        if (!user) throw new Error('Invalid username or password')
        
        const match = await bcrypt.compare(password, user.password)
        if (!match) throw new Error('Invalid username or password')
        
        return user
    } catch (err) {
        throw err
    }
}

function getLoginToken(user) {
    return jwt.sign({ _id: user._id }, secret, { expiresIn: '24h' })
}

async function validateToken(token) {
    try {
        const decoded = jwt.verify(token, secret)
        return decoded
    } catch (err) {
        throw err
    }
}

module.exports = {
    login,
    getLoginToken,
    validateToken
} 