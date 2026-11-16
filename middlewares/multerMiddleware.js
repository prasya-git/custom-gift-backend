const multer = require('multer')
const path = require('path')
const fs = require('fs')

const uploadFolder = path.join(__dirname, '../uploads')

if (!fs.existsSync(uploadFolder)) {
    fs.mkdirSync(uploadFolder, { recursive: true })
}

const storage = multer.diskStorage({

    destination: (req, file, callback) => {
        callback(null, uploadFolder)
    },

    filename: (req, file, callback) => {

        const extension = path.extname(file.originalname)

        const filename = `Gift-${Date.now()}-${Math.round(Math.random() * 1E9)}${extension}`

        callback(null, filename)
    }

})

const fileFilter = (req, file, callback) => {

    if (file.mimetype.startsWith('image/')) {
        callback(null, true)
    } else {
        callback(new Error('Only image files are allowed'), false)
    }

}

const multerMiddleware = multer({
    storage,
    fileFilter,
    limits: {
        fileSize: 5 * 1024 * 1024
    }
})

module.exports = multerMiddleware