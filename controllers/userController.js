const users = require('../models/userModel')

// Get All Users - Admin
exports.getAllUsersController = async (req, res) => {

    console.log('Inside getAllUsersController')

    try {

        const allUsers = await users.find({
            role: 'user'
        }).select('-password').sort({ createdAt: -1 })

        res.status(200).json(allUsers)

    } catch (error) {

        res.status(500).json(error.message)

    }

}


// Get Single User - Admin
exports.getSingleUserController = async (req, res) => {

    try {

        const { id } = req.params

        const user = await users.findById(id).select('-password')

        if (!user) {
            return res.status(404).json('User Not Found')
        }

        res.status(200).json(user)

    } catch (error) {

        res.status(500).json(error.message)

    }

}