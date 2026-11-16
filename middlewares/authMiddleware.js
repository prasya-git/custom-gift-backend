const jwt = require('jsonwebtoken')

const authMiddleware = (req, res, next) => {

    console.log('Inside Authentication Middleware')

    const authHeader = req.headers.authorization

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json('Token Missing. Please Login!')
    }

    const token = authHeader.split(' ')[1]

    try {

        const jwtResponse = jwt.verify(token, process.env.JWTSECRET)

        req.payload = jwtResponse.userMail
        req.userId = jwtResponse.userId
        req.role = jwtResponse.role

        next()

    } catch (error) {

        res.status(401).json('Invalid or Expired Token')

    }
}

module.exports = authMiddleware