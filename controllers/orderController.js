
const orders = require('../models/orderModel')
const gifts = require('../models/giftModel')
const mongoose = require('mongoose')
const settings = require('../models/settingsModel')
const stripe = process.env.STRIPE_SK
    ? require('stripe')(process.env.STRIPE_SK)
    : null


// -----------------------------------------------------
// COMMON FUNCTIONS
// -----------------------------------------------------

// Get delivery charge from settings
const getDeliveryCharge = async () => {
    const storeSettings = await settings.findOne({ key: 'store' })

    const charge = Number(storeSettings?.deliveryCharge ?? 50)

    return Number.isFinite(charge) && charge >= 0 ? charge : 50
}


// Validate gift items and get prices from MongoDB
const prepareOrderItems = async (items) => {

    if (!Array.isArray(items) || items.length === 0) {
        throw new Error('Order Items Missing')
    }

    const orderItems = []
    let totalAmount = 0

    for (const item of items) {

        if (!mongoose.isValidObjectId(item.giftId)) {
            throw new Error('Invalid Gift ID')
        }

        const quantity = Number(item.quantity)

        if (!Number.isInteger(quantity) || quantity < 1) {
            throw new Error('Invalid Quantity')
        }

        const gift = await gifts.findOne({
            _id: item.giftId,
            status: 'active'
        })

        if (!gift) {
            throw new Error('Gift Not Found')
        }

        const customization = item.customization || {}

        if (!gift.customizable && (
            customization.name ||
            customization.message ||
            customization.photo
        )) {
            throw new Error(`${gift.name} does not support customization`)
        }

        orderItems.push({
            giftId: gift._id,
            name: gift.name,
            image: gift.image,
            price: gift.price,
            quantity,

            customization: {
                name: customization.name || '',
                message: customization.message || '',
                photo: customization.photo || ''
            }
        })

        totalAmount += Number(gift.price) * quantity
    }

    return {
        orderItems,
        totalAmount
    }
}


// Reserve stock safely
const reserveStock = async (orderItems) => {

    const reservedItems = []

    try {

        for (const item of orderItems) {

            const updatedGift = await gifts.findOneAndUpdate(
                {
                    _id: item.giftId,
                    status: 'active',
                    stock: { $gte: item.quantity }
                },
                {
                    $inc: { stock: -item.quantity }
                },
                {
                    new: true
                }
            )

            if (!updatedGift) {
                throw new Error(`Insufficient Stock for ${item.name}`)
            }

            reservedItems.push(item)
        }

        return true

    } catch (error) {

        // Restore stock reserved before the error
        for (const item of reservedItems) {
            await gifts.findByIdAndUpdate(item.giftId, {
                $inc: { stock: item.quantity }
            })
        }

        throw error
    }
}


// Restore stock only once for an order
const restoreOrderStock = async (orderId) => {

    const order = await orders.findOneAndUpdate(
        {
            _id: orderId,
            stockReserved: true,
            stockRestored: false
        },
        {
            $set: {
                stockRestored: true
            }
        },
        {
            new: true
        }
    )

    if (!order) {
        return false
    }

    for (const item of order.items) {

        await gifts.findByIdAndUpdate(item.giftId, {
            $inc: {
                stock: item.quantity
            }
        })
    }

    return true
}


// -----------------------------------------------------
// PLACE ORDER - CASH ON DELIVERY
// -----------------------------------------------------

exports.placeOrderController = async (req, res) => {

    try {

        const { items, deliveryAddress, paymentMethod } = req.body

        if (!items || items.length === 0 || !deliveryAddress) {
            return res.status(400).json({
                message: 'Order Details Missing'
            })
        }

        if (
            !deliveryAddress.name ||
            !deliveryAddress.phone ||
            !deliveryAddress.address ||
            !deliveryAddress.city ||
            !deliveryAddress.pincode
        ) {
            return res.status(400).json({
                message: 'Complete Delivery Address Required'
            })
        }

        // Online payment must use Stripe Checkout
        if (paymentMethod && paymentMethod !== 'COD') {
            return res.status(400).json({
                message: 'Use Stripe Checkout for Online Payments'
            })
        }

        const { orderItems, totalAmount } =
            await prepareOrderItems(items)

        const deliveryCharge = await getDeliveryCharge()

        // Reserve stock
        await reserveStock(orderItems)

        let newOrder

        try {

            newOrder = await orders.create({

                orderId: `GFT${Date.now()}`,

                userId: req.userId,

                items: orderItems,

                totalAmount: totalAmount + deliveryCharge,

                deliveryCharge,

                paymentMethod: 'COD',

                paymentStatus: 'Pending',

                orderStatus: 'Order Placed',

                stockReserved: true,

                stockRestored: false,

                deliveryAddress

            })

        } catch (error) {

            // Restore stock if order creation fails
            for (const item of orderItems) {
                await gifts.findByIdAndUpdate(item.giftId, {
                    $inc: { stock: item.quantity }
                })
            }

            throw error
        }

        res.status(201).json({
            message: 'Order Placed Successfully',
            order: newOrder
        })

    } catch (error) {

        console.error('Place Order Error:', error.message)

        res.status(400).json({
            message: error.message
        })
    }
}


// -----------------------------------------------------
// CREATE STRIPE CHECKOUT SESSION - ONLINE PAYMENT
// -----------------------------------------------------

exports.createCheckoutSessionController = async (req, res) => {

    let newOrder = null
    let session = null

    try {

        if (!stripe) {
            return res.status(500).json({
                message: 'Stripe is not configured. Check STRIPE_SK in backend .env'
            })
        }

        const { items, deliveryAddress } = req.body

        if (!items || items.length === 0 || !deliveryAddress) {
            return res.status(400).json({
                message: 'Order Details Missing'
            })
        }

        if (
            !deliveryAddress.name ||
            !deliveryAddress.phone ||
            !deliveryAddress.address ||
            !deliveryAddress.city ||
            !deliveryAddress.pincode
        ) {
            return res.status(400).json({
                message: 'Complete Delivery Address Required'
            })
        }

        // Get actual gift prices from database
        const { orderItems, totalAmount } =
            await prepareOrderItems(items)

        const deliveryCharge = await getDeliveryCharge()

        const finalAmount = totalAmount + deliveryCharge

        // Reserve stock
        await reserveStock(orderItems)

        try {

            newOrder = await orders.create({

                orderId: `GFT${Date.now()}`,

                userId: req.userId,

                items: orderItems,

                totalAmount: finalAmount,

                deliveryCharge,

                paymentMethod: 'Online',

                paymentStatus: 'Pending',

                orderStatus: 'Order Placed',

                stockReserved: true,

                stockRestored: false,

                deliveryAddress

            })

        } catch (error) {

            // Restore stock if order creation fails
            for (const item of orderItems) {
                await gifts.findByIdAndUpdate(item.giftId, {
                    $inc: { stock: item.quantity }
                })
            }

            throw error
        }

        const clientURL = (
            process.env.CLIENT_URL || 'http://localhost:5173'
        ).replace(/\/$/, '')

        // Create Stripe Checkout Session
        session = await stripe.checkout.sessions.create({

            mode: 'payment',

            line_items: [
                {
                    price_data: {
                        currency: 'inr',
                        product_data: {
                            name: `GIFTORA Order ${newOrder.orderId}`,
                            description: 'Customized Gift Order'
                        },
                        unit_amount: Math.round(finalAmount * 100)
                    },
                    quantity: 1
                }
            ],

            metadata: {
                orderId: newOrder._id.toString(),
                userId: req.userId.toString()
            },

            success_url:
                `${clientURL}/payment-success?session_id={CHECKOUT_SESSION_ID}`,

            cancel_url:
                `${clientURL}/payment-failed?session_id={CHECKOUT_SESSION_ID}`,

            expires_at: Math.floor(Date.now() / 1000) + (30 * 60)

        })

        // Save Stripe session ID
        newOrder.stripeSessionId = session.id
        await newOrder.save()

        res.status(200).json({
            success: true,
            message: 'Stripe Checkout Session Created',
            url: session.url,
            orderId: newOrder.orderId
        })

    } catch (error) {

        console.error('Stripe Checkout Error:', error.message)

        // Expire Stripe session if it was created
        if (session && session.status === 'open') {
            try {
                await stripe.checkout.sessions.expire(session.id)
            } catch (expireError) {
                console.error('Stripe Expire Error:', expireError.message)
            }
        }

        // Restore stock and remove incomplete order
        if (newOrder) {
            try {
                await restoreOrderStock(newOrder._id)
                await orders.findByIdAndDelete(newOrder._id)
            } catch (restoreError) {
                console.error('Stock Restore Error:', restoreError.message)
            }
        }

        res.status(500).json({
            message: error.message || 'Unable to create Stripe Checkout Session'
        })
    }
}


// -----------------------------------------------------
// VERIFY STRIPE PAYMENT
// -----------------------------------------------------

exports.verifyStripePaymentController = async (req, res) => {

    try {

        if (!stripe) {
            return res.status(500).json({
                success: false,
                message: 'Stripe is not configured'
            })
        }

        const { sessionId } = req.params

        if (!sessionId) {
            return res.status(400).json({
                success: false,
                message: 'Stripe Session ID Missing'
            })
        }

        // Get payment details from Stripe
        const session = await stripe.checkout.sessions.retrieve(sessionId)

        // Check logged-in user
        if (
            !session.metadata ||
            session.metadata.userId !== req.userId.toString()
        ) {
            return res.status(403).json({
                success: false,
                message: 'Invalid Payment Session'
            })
        }

        // Find the matching order
        const order = await orders.findOne({
            _id: session.metadata.orderId,
            userId: req.userId,
            stripeSessionId: sessionId
        })

        if (!order) {
            return res.status(404).json({
                success: false,
                message: 'Order Not Found'
            })
        }

        if (session.payment_status !== 'paid') {
            return res.status(400).json({
                success: false,
                message: 'Payment is not completed yet'
            })
        }

        // Update payment status
        order.paymentStatus = 'Paid'

        order.stripePaymentIntentId =
            typeof session.payment_intent === 'string'
                ? session.payment_intent
                : session.payment_intent?.id || null

        await order.save()

        res.status(200).json({
            success: true,
            message: 'Payment Verified Successfully',
            order
        })

    } catch (error) {

        console.error('Payment Verification Error:', error.message)

        res.status(500).json({
            success: false,
            message: error.message
        })
    }
}


// -----------------------------------------------------
// STRIPE WEBHOOK
// -----------------------------------------------------

exports.stripeWebhookController = async (req, res) => {

    if (!stripe) {
        return res.status(500).send('Stripe is not configured')
    }

    const signature = req.headers['stripe-signature']

    let event

    try {

        event = stripe.webhooks.constructEvent(
            req.body,
            signature,
            process.env.STRIPE_WEBHOOK_SECRET
        )

    } catch (error) {

        console.error('Stripe Webhook Signature Error:', error.message)

        return res.status(400).send(
            `Webhook Error: ${error.message}`
        )
    }

    try {

        const session = event.data.object

        // Payment completed
        if (event.type === 'checkout.session.completed') {

            if (session.payment_status === 'paid' && session.metadata) {

                const order = await orders.findOne({
                    _id: session.metadata.orderId,
                    userId: session.metadata.userId,
                    stripeSessionId: session.id
                })

                if (order && order.paymentStatus !== 'Paid') {

                    order.paymentStatus = 'Paid'

                    order.stripePaymentIntentId =
                        typeof session.payment_intent === 'string'
                            ? session.payment_intent
                            : session.payment_intent?.id || null

                    await order.save()
                }
            }
        }

        // Checkout session expired
        if (event.type === 'checkout.session.expired') {

            const order = await orders.findOne({
                stripeSessionId: session.id
            })

            if (order && order.paymentStatus !== 'Paid') {

                order.paymentStatus = 'Failed'
                order.orderStatus = 'Cancelled'

                await order.save()

                await restoreOrderStock(order._id)
            }
        }

        res.status(200).json({
            received: true
        })

    } catch (error) {

        console.error('Stripe Webhook Processing Error:', error.message)

        res.status(500).json({
            message: 'Webhook Processing Failed'
        })
    }
}


// -----------------------------------------------------
// CANCEL STRIPE CHECKOUT SESSION
// -----------------------------------------------------

exports.cancelCheckoutSessionController = async (req, res) => {

    try {

        if (!stripe) {
            return res.status(500).json({
                message: 'Stripe is not configured'
            })
        }

        const { sessionId } = req.params

        const order = await orders.findOne({
            stripeSessionId: sessionId,
            userId: req.userId
        })

        if (!order) {
            return res.status(404).json({
                message: 'Order Not Found'
            })
        }

        if (order.paymentStatus === 'Paid') {
            return res.status(400).json({
                message: 'This order has already been paid'
            })
        }

        const session = await stripe.checkout.sessions.retrieve(sessionId)

        // Payment may have completed before the user returned
        if (session.payment_status === 'paid') {

            order.paymentStatus = 'Paid'

            order.stripePaymentIntentId =
                typeof session.payment_intent === 'string'
                    ? session.payment_intent
                    : session.payment_intent?.id || null

            await order.save()

            return res.status(400).json({
                message: 'Payment has already been completed'
            })
        }

        // Do not cancel a completed session with pending payment
        if (session.status === 'complete') {
            return res.status(400).json({
                message: 'Payment is still processing. Please check your order again.'
            })
        }

        // Expire open session
        if (session.status === 'open') {
            await stripe.checkout.sessions.expire(sessionId)
        }

        order.orderStatus = 'Cancelled'
        order.paymentStatus = 'Failed'

        await order.save()

        await restoreOrderStock(order._id)

        res.status(200).json({
            success: true,
            message: 'Checkout Cancelled Successfully'
        })

    } catch (error) {

        console.error('Cancel Checkout Error:', error.message)

        res.status(500).json({
            message: error.message
        })
    }
}


// -----------------------------------------------------
// GET LOGGED-IN USER ORDERS
// -----------------------------------------------------

exports.getUserOrdersController = async (req, res) => {

    try {

        const userOrders = await orders.find({
            userId: req.userId
        })
            .populate('items.giftId')
            .sort({ createdAt: -1 })

        res.status(200).json(userOrders)

    } catch (error) {

        res.status(500).json({
            message: error.message
        })
    }
}


// -----------------------------------------------------
// VIEW SINGLE ORDER - OWNER ONLY
// -----------------------------------------------------

exports.viewOrderController = async (req, res) => {

    try {

        const { id } = req.params

        const order = await orders.findOne({
            _id: id,
            userId: req.userId
        }).populate('items.giftId')

        if (!order) {
            return res.status(404).json({
                message: 'Order Not Found'
            })
        }

        res.status(200).json(order)

    } catch (error) {

        res.status(500).json({
            message: error.message
        })
    }
}


// -----------------------------------------------------
// GET ALL ORDERS - ADMIN
// -----------------------------------------------------

exports.getAllOrdersController = async (req, res) => {

    try {

        const allOrders = await orders.find()
            .populate('userId', 'username email phone')
            .populate('items.giftId')
            .sort({ createdAt: -1 })

        res.status(200).json(allOrders)

    } catch (error) {

        res.status(500).json({
            message: error.message
        })
    }
}


// -----------------------------------------------------
// UPDATE ORDER STATUS - ADMIN
// -----------------------------------------------------

exports.updateOrderStatusController = async (req, res) => {

    try {

        const { id } = req.params
        const { orderStatus, paymentStatus } = req.body

        const allowedStatuses = [
            'Order Placed',
            'Processing',
            'Shipped',
            'Delivered',
            'Cancelled'
        ]

        const updateData = {}

        if (orderStatus !== undefined) {

            if (!allowedStatuses.includes(orderStatus)) {
                return res.status(400).json({
                    message: 'Invalid Order Status'
                })
            }

            updateData.orderStatus = orderStatus
        }

        // Do not allow admin to manually mark an order as paid
        if (paymentStatus !== undefined) {

            if (!['Pending', 'Failed'].includes(paymentStatus)) {
                return res.status(400).json({
                    message: 'Payment Status Can Only Be Updated by Payment Verification'
                })
            }

            updateData.paymentStatus = paymentStatus
        }

        if (Object.keys(updateData).length === 0) {
            return res.status(400).json({
                message: 'No Status Provided'
            })
        }

        const updatedOrder = await orders.findByIdAndUpdate(
            id,
            updateData,
            {
                new: true,
                runValidators: true
            }
        )

        if (!updatedOrder) {
            return res.status(404).json({
                message: 'Order Not Found'
            })
        }

        res.status(200).json({
            message: 'Order Updated Successfully',
            order: updatedOrder
        })

    } catch (error) {

        res.status(500).json({
            message: error.message
        })
    }
}


// -----------------------------------------------------
// CANCEL ORDER - USER
// -----------------------------------------------------

exports.cancelOrderController = async (req, res) => {

    try {

        const { id } = req.params

        const order = await orders.findOne({
            _id: id,
            userId: req.userId
        })

        if (!order) {
            return res.status(404).json({
                message: 'Order Not Found'
            })
        }

        if (!['Order Placed', 'Processing'].includes(order.orderStatus)) {
            return res.status(400).json({
                message: 'This Order Cannot Be Cancelled'
            })
        }

        if (order.paymentStatus === 'Paid') {
            return res.status(400).json({
                message: 'This order is already paid. Please contact the store for cancellation and refund.'
            })
        }

        // Expire unpaid Stripe Checkout Session
        if (
            order.paymentMethod === 'Online' &&
            order.stripeSessionId &&
            stripe
        ) {

            const session = await stripe.checkout.sessions.retrieve(
                order.stripeSessionId
            )

            if (session.payment_status === 'paid') {

                order.paymentStatus = 'Paid'

                await order.save()

                return res.status(400).json({
                    message: 'This order has already been paid'
                })
            }

            if (session.status === 'complete') {
                return res.status(400).json({
                    message: 'Payment is still processing. Please check again.'
                })
            }

            if (session.status === 'open') {
                await stripe.checkout.sessions.expire(
                    order.stripeSessionId
                )
            }
        }

        order.orderStatus = 'Cancelled'

        if (order.paymentMethod === 'Online') {
            order.paymentStatus = 'Failed'
        }

        await order.save()

        await restoreOrderStock(order._id)

        res.status(200).json({
            message: 'Order Cancelled Successfully',
            order
        })

    } catch (error) {

        console.error('Cancel Order Error:', error.message)

        res.status(500).json({
            message: error.message
        })
    }
}
