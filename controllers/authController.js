const bcrypt = require('bcryptjs')
const users = require('../models/userModel')
const jwt = require('jsonwebtoken')

// Generate JWT Token
const generateToken = (user) => {

    return jwt.sign(
        {
            userId: user._id,
            userMail: user.email,
            role: user.role
        },
        process.env.JWTSECRET,
        { expiresIn: '7d' }
    )

}

// Register
exports.registerController = async (req, res) => {

    console.log('Inside registerController')

    try {

        const { username, email, password, phone } = req.body

        if (!username || !email || !password) {
            return res.status(400).json('Please provide all required fields')
        }

        const existingUser = await users.findOne({
            email: email.toLowerCase()
        })

        if (existingUser) {
            return res.status(409).json('User Already Exists. Please Login!')
        }

        const encryptedPassword = await bcrypt.hash(password, 10)

        const newUser = await users.create({

            username,
            email: email.toLowerCase(),
            password: encryptedPassword,
            phone,
            role: 'user'

        })

        res.status(201).json({
            message: 'Registration Successful',
            user: {
                id: newUser._id,
                username: newUser.username,
                email: newUser.email,
                role: newUser.role
            }
        })

    } catch (error) {

        res.status(500).json(error.message)

    }

}


// Login
exports.loginController = async (req, res) => {

    console.log('Inside loginController')

    try {

        const { email, password } = req.body

        const existingUser = await users.findOne({
            email: email?.toLowerCase()
        })

        if (!existingUser) {
            return res.status(404).json('Invalid Email. Please Register!')
        }

        const isPasswordMatch = await bcrypt.compare(
            password,
            existingUser.password
        )

        if (!isPasswordMatch) {
            return res.status(401).json('Invalid Password!')
        }

        const token = generateToken(existingUser)

        res.status(200).json({

            message: 'Login Successful',

            user: {
                id: existingUser._id,
                username: existingUser.username,
                email: existingUser.email,
                role: existingUser.role,
                phone: existingUser.phone,
                address: existingUser.address,
                picture: existingUser.picture
            },

            token

        })

    } catch (error) {

        res.status(500).json(error.message)

    }

}


// Get logged-in user
exports.getUserProfileController = async (req, res) => {

    try {

        const user = await users.findById(req.userId).select('-password')

        if (!user) {
            return res.status(404).json('User Not Found')
        }

        res.status(200).json(user)

    } catch (error) {

        res.status(500).json(error.message)

    }

}


// Edit user profile
exports.userEditController = async (req, res) => {

    try {

        const { username, phone, address } = req.body

        const updatedData = {
            username,
            phone,
            address
        }

        if (req.file) {
            updatedData.picture = req.file.filename
        }

        const updatedUser = await users.findByIdAndUpdate(
            req.userId,
            updatedData,
            {
                new: true,
                runValidators: true
            }
        ).select('-password')

        if (!updatedUser) {
            return res.status(404).json('User Not Found')
        }

        res.status(200).json(updatedUser)

    } catch (error) {

        res.status(500).json(error.message)

    }

}