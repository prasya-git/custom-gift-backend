
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

router.post('/register', authController.registerController)
router.post('/login', authController.loginController)

router.get('/home-gifts', giftController.getHomeGiftsController)
router.get('/all-gifts', giftController.getAllGiftsController)
router.get('/view-gift/:id', giftController.viewGiftController)

router.post('/contact', contactController.addContactController)


// =====================================================
// USER AUTHORIZED ROUTES
// =====================================================

router.get(
    '/user-profile',
    authMiddleware,
    authController.getUserProfileController
)

router.put(
    '/user-profile',
    authMiddleware,
    multerMiddleware.single('picture'),
    authController.userEditController
)

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


// COD order
router.post(
    '/place-order',
    authMiddleware,
    orderController.placeOrderController
)


// Stripe online payment
router.post(
    '/create-checkout-session',
    authMiddleware,
    orderController.createCheckoutSessionController
)

// Verify Stripe payment
router.get(
    '/verify-payment/:sessionId',
    authMiddleware,
    orderController.verifyStripePaymentController
)

// Cancel an unpaid Stripe checkout session
router.post(
    '/cancel-checkout/:sessionId',
    authMiddleware,
    orderController.cancelCheckoutSessionController
)


// User orders
router.get(
    '/user-orders',
    authMiddleware,
    orderController.getUserOrdersController
)

router.get(
    '/view-order/:id',
    authMiddleware,
    orderController.viewOrderController
)

router.put(
    '/cancel-order/:id',
    authMiddleware,
    orderController.cancelOrderController
)


// =====================================================
// ADMIN AUTHORIZED ROUTES
// =====================================================

router.post(
    '/add-gift',
    authMiddleware,
    adminMiddleware,
    multerMiddleware.single('image'),
    giftController.addGiftController
)

router.get(
    '/gift-list',
    authMiddleware,
    adminMiddleware,
    giftController.getAllAdminGiftsController
)

router.put(
    '/update-gift/:id',
    authMiddleware,
    adminMiddleware,
    multerMiddleware.single('image'),
    giftController.updateGiftController
)

router.delete(
    '/delete-gift/:id',
    authMiddleware,
    adminMiddleware,
    giftController.deleteGiftController
)

router.get(
    '/order-list',
    authMiddleware,
    adminMiddleware,
    orderController.getAllOrdersController
)

router.put(
    '/update-order/:id',
    authMiddleware,
    adminMiddleware,
    orderController.updateOrderStatusController
)

router.get(
    '/user-list',
    authMiddleware,
    adminMiddleware,
    userController.getAllUsersController
)

router.get(
    '/user-details/:id',
    authMiddleware,
    adminMiddleware,
    userController.getSingleUserController
)

router.get(
    '/contact-list',
    authMiddleware,
    adminMiddleware,
    contactController.getAllContactsController
)

router.get(
    '/settings',
    authMiddleware,
    adminMiddleware,
    settingsController.getSettingsController
)

router.put(
    '/settings',
    authMiddleware,
    adminMiddleware,
    settingsController.updateSettingsController
)


module.exports = router
