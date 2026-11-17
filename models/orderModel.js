
const mongoose = require('mongoose')

const orderSchema = new mongoose.Schema({

    orderId: {
        type: String,
        unique: true
    },

    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'users',
        required: true
    },

    items: [
        {
            giftId: {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'gifts',
                required: true
            },

            name: String,
            image: String,
            price: Number,

            quantity: {
                type: Number,
                required: true,
                min: 1
            },

            customization: {
                name: String,
                message: String,
                photo: String
            }
        }
    ],

    totalAmount: {
        type: Number,
        required: true
    },

    deliveryCharge: {
        type: Number,
        default: 0
    },

    paymentMethod: {
        type: String,
        enum: ['COD', 'Online'],
        default: 'COD'
    },

    paymentStatus: {
        type: String,
        enum: ['Pending', 'Paid', 'Failed'],
        default: 'Pending'
    },

    stripeSessionId: {
        type: String,
        default: null
    },

    stripePaymentIntentId: {
        type: String,
        default: null
    },

    // Tracks whether stock has been deducted for this order
    stockReserved: {
        type: Boolean,
        default: false
    },

    // Prevents restoring the same stock more than once
    stockRestored: {
        type: Boolean,
        default: false
    },

    orderStatus: {
        type: String,
        enum: [
            'Order Placed',
            'Processing',
            'Shipped',
            'Delivered',
            'Cancelled'
        ],
        default: 'Order Placed'
    },

    deliveryAddress: {
        name: String,
        phone: String,
        address: String,
        city: String,
        state: String,
        pincode: String
    }

}, { timestamps: true })

const orders = mongoose.model('orders', orderSchema)

module.exports = orders
