const gifts = require('../models/giftModel')
const fs = require('fs')
const path = require('path')

// Add Gift - Admin
exports.addGiftController = async (req, res) => {

    console.log('Inside addGiftController')

    try {

        const {
            name,
            description,
            price,
            category,
            occasion,
            stock,
            customizable,
            customizationOptions
        } = req.body

        if (!name || !description || !price || !category || !req.file) {
            return res.status(400).json('Please provide all required gift details')
        }

        const existingGift = await gifts.findOne({
            name: { $regex: `^${name}$`, $options: 'i' }
        })

        if (existingGift) {
            return res.status(409).json('Gift Already Exists')
        }

        const newGift = await gifts.create({

            name,
            description,
            price: Number(price),
            category,
            occasion,
            stock: Number(stock || 0),
            image: req.file.filename,
            customizable: customizable === 'false' ? false : true,
            customizationOptions: customizationOptions
                ? JSON.parse(customizationOptions)
                : ['name', 'message', 'photo']

        })

        res.status(201).json(newGift)

    } catch (error) {

        res.status(500).json(error.message)

    }

}


// Get Home Gifts - Latest 4
exports.getHomeGiftsController = async (req, res) => {

    try {

        const homeGifts = await gifts.find({
            status: 'active',
            stock: { $gt: 0 }
        })
        .sort({ _id: -1 })
        .limit(4)

        res.status(200).json(homeGifts)

    } catch (error) {

        res.status(500).json(error.message)

    }

}


// Get All Gifts - Customer
exports.getAllGiftsController = async (req, res) => {

    try {

        const searchKey = req.query.search || ''
        const category = req.query.category || ''
        const occasion = req.query.occasion || ''

        const filter = {
            status: 'active',
            name: { $regex: searchKey, $options: 'i' }
        }

        if (category) {
            filter.category = category
        }

        if (occasion) {
            filter.occasion = occasion
        }

        const allGifts = await gifts.find(filter).sort({ _id: -1 })

        res.status(200).json(allGifts)

    } catch (error) {

        res.status(500).json(error.message)

    }

}


// View Single Gift
exports.viewGiftController = async (req, res) => {

    try {

        const { id } = req.params

        const giftDetails = await gifts.findById(id)

        if (!giftDetails) {
            return res.status(404).json('Gift Not Found')
        }

        res.status(200).json(giftDetails)

    } catch (error) {

        res.status(500).json(error.message)

    }

}


// Update Gift - Admin
exports.updateGiftController = async (req, res) => {

    try {

        const { id } = req.params

        const updateData = { ...req.body }

        if (updateData.price !== undefined) {
            updateData.price = Number(updateData.price)
        }

        if (updateData.stock !== undefined) {
            updateData.stock = Number(updateData.stock)
        }

        if (updateData.customizationOptions) {
            updateData.customizationOptions =
                typeof updateData.customizationOptions === 'string'
                    ? JSON.parse(updateData.customizationOptions)
                    : updateData.customizationOptions
        }

        if (req.file) {
            updateData.image = req.file.filename
        }

        const updatedGift = await gifts.findByIdAndUpdate(
            id,
            updateData,
            {
                new: true,
                runValidators: true
            }
        )

        if (!updatedGift) {
            return res.status(404).json('Gift Not Found')
        }

        res.status(200).json(updatedGift)

    } catch (error) {

        res.status(500).json(error.message)

    }

}


// Delete Gift - Admin
exports.deleteGiftController = async (req, res) => {

    try {

        const { id } = req.params

        const deletedGift = await gifts.findByIdAndDelete(id)

        if (!deletedGift) {
            return res.status(404).json('Gift Not Found')
        }

        // Delete stored product image
        if (deletedGift.image) {

            const imagePath = path.join(
                __dirname,
                '../uploads',
                deletedGift.image
            )

            if (fs.existsSync(imagePath)) {
                fs.unlinkSync(imagePath)
            }

        }

        res.status(200).json('Gift Deleted Successfully')

    } catch (error) {

        res.status(500).json(error.message)

    }

}


// Get all gifts - Admin
exports.getAllAdminGiftsController = async (req, res) => {

    try {

        const allGifts = await gifts.find().sort({ _id: -1 })

        res.status(200).json(allGifts)

    } catch (error) {

        res.status(500).json(error.message)

    }

}