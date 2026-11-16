const orders = require('../models/orderModel')
const gifts = require('../models/giftModel')
const mongoose = require('mongoose')
const settings = require('../models/settingsModel')

// Place Order - User
exports.placeOrderController = async (req, res) => {

    console.log('Inside placeOrderController')

    try {

        const { items, deliveryAddress, paymentMethod } = req.body

        if (!items || items.length === 0 || !deliveryAddress) {
            return res.status(400).json('Order Details Missing')
        }

        if (!deliveryAddress.name || !deliveryAddress.phone ||
            !deliveryAddress.address || !deliveryAddress.city ||
            !deliveryAddress.pincode) {
            return res.status(400).json('Complete Delivery Address Required')
        }

        const validPaymentMethods = ['COD', 'Online']

        if (!validPaymentMethods.includes(paymentMethod || 'COD')) {
            return res.status(400).json('Invalid Payment Method')
        }

        const orderItems = []
        let totalAmount = 0

        // Validate gifts and calculate total
        for (const item of items) {

            if (!mongoose.isValidObjectId(item.giftId)) {
                return res.status(400).json('Invalid Gift ID')
            }

            const gift = await gifts.findOne({
                _id: item.giftId,
                status: 'active'
            })

            if (!gift) {
                return res.status(404).json('Gift Not Found')
            }

            const quantity = Number(item.quantity)

            if (!Number.isInteger(quantity) || quantity < 1) {
                return res.status(400).json('Invalid Quantity')
            }

            if (gift.stock < quantity) {
                return res.status(400).json(`Insufficient Stock for ${gift.name}`)
            }

            const customization = item.customization || {}

            if (!gift.customizable && (
                customization.name ||
                customization.message ||
                customization.photo
            )) {
                return res.status(400).json(
                    `${gift.name} does not support customization`
                )
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

            totalAmount += gift.price * quantity

        }

        const storeSettings = await settings.findOne({ key: 'store' })

        const deliveryCharge = storeSettings
            ? storeSettings.deliveryCharge
            : 50

        const newOrder = await orders.create({

            orderId: `GFT${Date.now()}`,

            userId: req.userId,

            items: orderItems,

            totalAmount: totalAmount + deliveryCharge,

            deliveryCharge,

            paymentMethod: paymentMethod || 'COD',

            paymentStatus: 'Pending',

            deliveryAddress

        })

        // Reduce stock after successfully creating order
        for (const item of items) {

            await gifts.findByIdAndUpdate(item.giftId, {
                $inc: { stock: -Number(item.quantity) }
            })

        }

        res.status(201).json({
            message: 'Order Placed Successfully',
            order: newOrder
        })

    } catch (error) {

        res.status(500).json(error.message)

    }

}


// Get Logged-in User Orders
exports.getUserOrdersController = async (req, res) => {

    try {

        const userOrders = await orders.find({
            userId: req.userId
        })
        .populate('items.giftId')
        .sort({ createdAt: -1 })

        res.status(200).json(userOrders)

    } catch (error) {

        res.status(500).json(error.message)

    }

}


// View Single Order - Owner only
exports.viewOrderController = async (req, res) => {

    try {

        const { id } = req.params

        const order = await orders.findOne({
            _id: id,
            userId: req.userId
        }).populate('items.giftId')

        if (!order) {
            return res.status(404).json('Order Not Found')
        }

        res.status(200).json(order)

    } catch (error) {

        res.status(500).json(error.message)

    }

}


// Get All Orders - Admin
exports.getAllOrdersController = async (req, res) => {

    try {

        const allOrders = await orders.find()
            .populate('userId', 'username email phone')
            .populate('items.giftId')
            .sort({ createdAt: -1 })

        res.status(200).json(allOrders)

    } catch (error) {

        res.status(500).json(error.message)

    }

}


// Update Order Status - Admin
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
                return res.status(400).json('Invalid Order Status')
            }

            updateData.orderStatus = orderStatus

        }

        if (paymentStatus !== undefined) {

            if (!['Pending', 'Paid', 'Failed'].includes(paymentStatus)) {
                return res.status(400).json('Invalid Payment Status')
            }

            updateData.paymentStatus = paymentStatus

        }

        if (Object.keys(updateData).length === 0) {
            return res.status(400).json('No Status Provided')
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
            return res.status(404).json('Order Not Found')
        }

        res.status(200).json({
            message: 'Order Updated Successfully',
            order: updatedOrder
        })

    } catch (error) {

        res.status(500).json(error.message)

    }

}


// Cancel Order - User
exports.cancelOrderController = async (req, res) => {

    try {

        const { id } = req.params

        const order = await orders.findOne({
            _id: id,
            userId: req.userId
        })

        if (!order) {
            return res.status(404).json('Order Not Found')
        }

        if (!['Order Placed', 'Processing'].includes(order.orderStatus)) {
            return res.status(400).json('This Order Cannot Be Cancelled')
        }

        order.orderStatus = 'Cancelled'

        await order.save()

        // Restore gift stock
        for (const item of order.items) {

            await gifts.findByIdAndUpdate(item.giftId, {
                $inc: { stock: item.quantity }
            })

        }

        res.status(200).json({
            message: 'Order Cancelled Successfully',
            order
        })

    } catch (error) {

        res.status(500).json(error.message)

    }

}