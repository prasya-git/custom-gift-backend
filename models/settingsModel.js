
const mongoose = require('mongoose')

const settingsSchema = new mongoose.Schema({

    key: {
        type: String,
        default: 'store',
        unique: true
    },

    storeName: {
        type: String,
        default: 'GIFTORA'
    },

    email: {
        type: String,
        default: 'hello@giftora.com'
    },

    phone: {
        type: String,
        default: '+91 98765 43210'
    },

    deliveryCharge: {
        type: Number,
        default: 50,
        min: 0
    }

}, { timestamps: true })

const settings = mongoose.model('settings', settingsSchema)

module.exports = settings
