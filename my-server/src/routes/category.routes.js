const express = require("express")
const mongoose = require("mongoose")
const { Readable } = require("stream")

const Category = require("../models/Category")
const { getBucket } = require("../services/gridfs")
const upload = require("../uploads") // multer memory storage

const router = express.Router()

/* GET ALL CATEGORY */
router.get("/", async (req, res) => {
    try {

        const categories = await Category.find();

        res.json(categories);

    } catch (error) {

        res.status(500).json({ message: error.message });

    }
})

// CREATE
router.post("/", async (req, res) => {

    try {

        const doc = await Category.create(req.body)

        res.status(201).json(doc)

    } catch (e) {
        console.log("CHI TIẾT LỖI TẠI SERVER:", e);
        res.status(500).json({
            message: "Lỗi Server rồi!",
            detail: e.message,
            stack: e.stack
        });

    }

})


// GET BY ID
router.get("/:id", async (req, res, next) => {

    try {

        const doc = await Category.findById(req.params.id)

        if (!doc)
            return res.status(404).json({ message: "Not found" })

        res.json(doc)

    } catch (e) {

        next(e)

    }

})


// UPDATE
router.patch("/:id", async (req, res, next) => {

    try {

        const doc = await Category.findByIdAndUpdate(
            req.params.id,
            req.body,
            {
                new: true,
                runValidators: true
            }
        )

        if (!doc)
            return res.status(404).json({ message: "Not found" })

        res.json(doc)

    } catch (e) {

        next(e)

    }

})


// DELETE
router.delete("/:id", async (req, res, next) => {

    try {

        const doc = await Category.findByIdAndDelete(req.params.id)

        if (!doc)
            return res.status(404).json({ message: "Not found" })

        res.json({ message: "Deleted" })

    } catch (e) {

        next(e)

    }
})

//Upload nhiều ảnh vào GridFS
//Front-end: multipart/form-data field name = images
router.post("/:id/banner", upload.array("banner", 10), async (req, res, next) => {
    try {

        const category = await Category.findById(req.params.id)
        if (!category)
            return res.status(404).json({ message: "Not found" })

        const bucket = getBucket()
        const files = req.files || []

        const records = []

        for (const file of files) {

            const readStream = Readable.from(file.buffer)

            const uploadStream = bucket.openUploadStream(file.originalname, {
                contentType: file.mimetype,
                metadata: { originalname: file.originalname }
            })

            await new Promise((resolve, reject) => {
                readStream
                    .pipe(uploadStream)
                    .on("error", reject)
                    .on("finish", resolve)
            })

            const fileId = uploadStream.id

            records.push({
                gridfsFileId: fileId,
                filename: uploadStream.filename,
                originalname: file.originalname,
                mimetype: file.mimetype,
                size: file.size,
                url: `/api/images/${fileId.toString()}`
            })
        }

        // thêm ảnh mới thay vì ghi đè
        category.banner.push(...records)

        await category.save()

        res.status(201).json(category)

    } catch (e) {
        next(e)
    }
})

/* =========================
   DELETE CATEGORY BANNER
========================= */
router.delete("/:id/banner/:fileId", async (req, res, next) => {
    try {

        const { id, fileId } = req.params

        const category = await Category.findById(id)

        if (!category)
            return res.status(404).json({ message: "Not found" })

        const oid = mongoose.Types.ObjectId.createFromHexString(String(fileId))

        category.banner = category.banner.filter(
            img => img.gridfsFileId.toString() !== oid.toString()
        )

        await category.save()

        const bucket = getBucket()

        await bucket.delete(oid)

        res.json(category)

    } catch (e) {
        next(e)
    }
})

module.exports = router;