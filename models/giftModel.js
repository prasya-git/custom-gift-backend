const mongoose = require('mongoose')

const giftSchema = new mongoose.Schema({

    name: {
        type: String,
        required: true,
        trim: true
    },

    description: {
        type: String,
        required: true
    },

    price: {
        type: Number,
        required: true
    },

    category: {
        type: String,
        required: true
    },

    image: {
        type: String,
        required: true
    },

    images: {
        type: [String],
        default: []
    },

    occasion: {
        type: String,
        default: ''
    },

    stock: {
        type: Number,
        default: 0
    },

    customizable: {
        type: Boolean,
        default: true
    },

    customizationOptions: {
        type: [String],
        default: ['name', 'message', 'photo']
    },

    status: {
        type: String,
        enum: ['active', 'inactive'],
        default: 'active'
    }

}, { timestamps: true })

const gifts = mongoose.model('gifts', giftSchema)

module.exports = gifts