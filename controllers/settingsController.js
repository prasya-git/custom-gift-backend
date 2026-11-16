
const settings = require('../models/settingsModel')

// Get Store Settings - Admin
exports.getSettingsController = async (req, res) => {

    try {

        let storeSettings = await settings.findOne({ key: 'store' })

        // Create default settings if they do not exist
        if (!storeSettings) {
            storeSettings = await settings.create({
                key: 'store'
            })
        }

        res.status(200).json(storeSettings)

    } catch (error) {

        res.status(500).json(error.message)

    }

}


// Update Store Settings - Admin
exports.updateSettingsController = async (req, res) => {

    try {

        const {
            storeName,
            email,
            phone,
            deliveryCharge
        } = req.body

        const updateData = {}

        if (storeName !== undefined) {
            updateData.storeName = storeName
        }

        if (email !== undefined) {
            updateData.email = email
        }

        if (phone !== undefined) {
            updateData.phone = phone
        }

        if (deliveryCharge !== undefined) {

            const charge = Number(deliveryCharge)

            if (!Number.isFinite(charge) || charge < 0) {
                return res.status(400).json('Invalid Delivery Charge')
            }

            updateData.deliveryCharge = charge
        }

        if (Object.keys(updateData).length === 0) {
            return res.status(400).json('No Settings Provided')
        }

        const updatedSettings = await settings.findOneAndUpdate(
            { key: 'store' },
            {
                $set: updateData,
                $setOnInsert: { key: 'store' }
            },
            {
                new: true,
                upsert: true,
                runValidators: true,
                setDefaultsOnInsert: true
            }
        )

        res.status(200).json({
            message: 'Settings Updated Successfully',
            settings: updatedSettings
        })

    } catch (error) {

        res.status(500).json(error.message)

    }

}
