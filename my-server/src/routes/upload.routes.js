const router = require("express").Router()
const upload = require("../uploads")
const { getBucket } = require("../services/gridfs")

router.post("/", upload.single("image"), async (req, res, next) => {
    try {

        if (!req.file) {
            return res.status(400).json({ message: "No file uploaded" })
        }

        const bucket = getBucket()

        const uploadStream = bucket.openUploadStream(
            req.file.originalname,
            { contentType: req.file.mimetype }
        )

        uploadStream.end(req.file.buffer)

        uploadStream.on("finish", () => {

            res.json({
                fileId: uploadStream.id.toString() // 🔥 THÊM .toString()
            })

        })

    } catch (err) {
        next(err)
    }
})

module.exports = router