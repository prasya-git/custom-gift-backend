const contacts = require('../models/contactModel')

// Add Contact Message
exports.addContactController = async (req, res) => {

    try {

        const { name, email, subject, message } = req.body

        if (!name || !email || !message) {
            return res.status(400).json('Please Fill All Required Fields')
        }

        const newMessage = await contacts.create({
            name,
            email,
            subject,
            message
        })

        res.status(201).json({
            message: 'Message Sent Successfully',
            data: newMessage
        })

    } catch (error) {

        res.status(500).json(error.message)

    }

}


// Get Contact Messages - Admin
exports.getAllContactsController = async (req, res) => {

    try {

        const allMessages = await contacts.find()
            .sort({ createdAt: -1 })

        res.status(200).json(allMessages)

    } catch (error) {

        res.status(500).json(error.message)

    }

}