const express = require('express')

const router = new express.Router()

// Controllers
const authController = require('../controllers/authController')
const giftController = require('../controllers/giftController')
const orderController = require('../controllers/orderController')
const userController = require('../controllers/userController')
const contactController = require('../controllers/contactController')
const settingsController = require('../controllers/settingsController')

// Middlewares
const authMiddleware = require('../middlewares/authMiddleware')
const adminMiddleware = require('../middlewares/adminMiddleware')
const multerMiddleware = require('../middlewares/multerMiddleware')



// =====================================================
// PUBLIC ROUTES
// =====================================================

// Register
router.post('/register', authController.registerController)

// Login
router.post('/login', authController.loginController)

// Home gifts
router.get('/home-gifts', giftController.getHomeGiftsController)

// All gifts
router.get('/all-gifts', giftController.getAllGiftsController)

// Single gift
router.get('/view-gift/:id', giftController.viewGiftController)

// Contact message
router.post('/contact', contactController.addContactController)




// =====================================================
// USER AUTHORIZED ROUTES
// =====================================================

// User profile
router.get('/user-profile', authMiddleware, authController.getUserProfileController)

// Edit profile
router.put(
    '/user-profile',
    authMiddleware,
    multerMiddleware.single('picture'),
    authController.userEditController
)

// Upload customization photo
router.post(
    '/upload-customization',
    authMiddleware,
    multerMiddleware.single('photo'),
    (req, res) => {
        if (!req.file) {
            return res.status(400).json('Please Select an Image')
        }

        res.status(200).json({
            message: 'Image Uploaded Successfully',
            image: req.file.filename
        })
    }
)


// Place order
router.post(
    '/place-order',
    authMiddleware,
    orderController.placeOrderController
)

// User orders
router.get(
    '/user-orders',
    authMiddleware,
    orderController.getUserOrdersController
)

// View single order
router.get(
    '/view-order/:id',
    authMiddleware,
    orderController.viewOrderController
)

// Cancel order
router.put(
    '/cancel-order/:id',
    authMiddleware,
    orderController.cancelOrderController
)


// =====================================================
// ADMIN AUTHORIZED ROUTES
// =====================================================

// Add gift
router.post(
    '/add-gift',
    authMiddleware,
    adminMiddleware,
    multerMiddleware.single('image'),
    giftController.addGiftController
)

// Get all gifts - Admin
router.get(
    '/gift-list',
    authMiddleware,
    adminMiddleware,
    giftController.getAllAdminGiftsController
)

// Update gift
router.put(
    '/update-gift/:id',
    authMiddleware,
    adminMiddleware,
    multerMiddleware.single('image'),
    giftController.updateGiftController
)

// Delete gift
router.delete(
    '/delete-gift/:id',
    authMiddleware,
    adminMiddleware,
    giftController.deleteGiftController
)

// Get all orders - Admin
router.get(
    '/order-list',
    authMiddleware,
    adminMiddleware,
    orderController.getAllOrdersController
)

// Update order status
router.put(
    '/update-order/:id',
    authMiddleware,
    adminMiddleware,
    orderController.updateOrderStatusController
)

// Get all customers
router.get(
    '/user-list',
    authMiddleware,
    adminMiddleware,
    userController.getAllUsersController
)

// Get single customer
router.get(
    '/user-details/:id',
    authMiddleware,
    adminMiddleware,
    userController.getSingleUserController
)

// Get contact messages
router.get(
    '/contact-list',
    authMiddleware,
    adminMiddleware,
    contactController.getAllContactsController
)
// Get Store Settings
router.get(
    '/settings',
    authMiddleware,
    adminMiddleware,
    settingsController.getSettingsController
)

// Update Store Settings
router.put(
    '/settings',
    authMiddleware,
    adminMiddleware,
    settingsController.updateSettingsController
)


module.exports = router