const jwt = require('jsonwebtoken')

const adminMiddleware = (req, res, next) => {

    console.log('Inside Admin Middleware')

    const authHeader = req.headers.authorization

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json('Admin Token Missing')
    }

    const token = authHeader.split(' ')[1]

    try {

        const jwtResponse = jwt.verify(token, process.env.JWTSECRET)

        if (jwtResponse.role !== 'admin') {
            return res.status(403).json('Only Admin Can Access This Resource')
        }

        req.payload = jwtResponse.userMail
        req.userId = jwtResponse.userId
        req.role = jwtResponse.role

        next()

    } catch (error) {

        res.status(401).json('Invalid Admin Token')

    }
}

module.exports = adminMiddleware