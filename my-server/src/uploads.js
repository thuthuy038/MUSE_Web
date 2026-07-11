const multer = require("multer")

const fileFilter = (_, file, cb) => {
    const ok = ["image/png", "image/jpeg"].includes(file.mimetype)
    cb(ok ? null : new Error("Only PNG/JPEG allowed"), ok)
}

module.exports = multer({
    storage: multer.memoryStorage(),
    fileFilter,
    limits: { fileSize: 10 * 1024 * 1024 } // giới hạn 10MB
})
