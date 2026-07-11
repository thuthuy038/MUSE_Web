const router = require("express").Router()
const mongoose = require("mongoose")
const Product = require("../models/Product")
const Category = require("../models/Category");
const upload = require("../uploads")
const { getBucket } = require("../services/gridfs")
const { Readable } = require("stream")
const { createNotification } = require('./notification.routes');

const checkLowStock = async () => {
    const lowStockProducts = await Product.find({
        stock: { $gt: 0, $lte: 5 }
    });
    
    for (const product of lowStockProducts) {
        await createNotification(
            'Sắp hết hàng',
            `Sản phẩm ${product.name} chỉ còn ${product.stock} sản phẩm`,
            'stock',
            product._id
        );
    }
};

// Chạy kiểm tra mỗi 6 giờ
setInterval(checkLowStock, 6 * 60 * 60 * 1000);

//GET all products
router.get("/", async (req, res, next) => {
    try {
        const products = await Product.find()
        res.json(products)
    } catch (e) {
        next(e)
    }
})

// CRUD
router.post("/", async (req, res, next) => {
    try {
        const doc = await Product.create(req.body)
        res.status(201).json(doc)
    } catch (e) {
        next(e)
    }
})


//GET product by id
router.get("/:id", async (req, res, next) => {
    try {
        const doc = await Product.findById(req.params.id)
        if (!doc) return res.status(404).json({ message: "Not found" })
        res.json(doc)
    } catch (e) {
        next(e)
    }
})

//UPDATE product (no images)
router.patch("/:id", async (req, res, next) => {
    try {
        const data = req.body;

        // Nếu lúc edit mà code bị xóa trống, hãy tạo mã mới
        if (!data.code || data.code.trim() === '') {
            const categoryDoc = await Category.findById(data.category);
            const { generateProductCode } = require("../utils/codeGenerator");
            data.code = await generateProductCode(categoryDoc ? categoryDoc.code : null);
        }
        const doc = await Product.findByIdAndUpdate(req.params.id, req.body, {
            new: true,
            runValidators: true,
        })
        if (!doc) return res.status(404).json({ message: "Not found" })
        res.json(doc)
    } catch (e) {
        next(e)
    }
})

//DELETE
router.delete("/:id", async (req, res, next) => {
    try {
        const product = await Product.findById(req.params.id)
        if (!product) return res.status(404).json({ message: "Not found" })

        //xóa ảnh trong gridfs
        const bucket = getBucket()
        for (const img of product.images) {
            try {
                await bucket.delete(img.gridfsFileId)
            } catch (err) {
                next(err)
            }
        }
        await product.deleteOne()
        res.json({ message: "Deleted" })
    } catch (e) {
        next(e)
    }
})

//Upload nhiều ảnh vào GridFS
//Front-end: multipart/form-data field name = images
router.post("/:id/images", upload.array("images", 10), async (req, res, next) => {
    try {
        const product = await Product.findById(req.params.id)
        if (!product) return res.status(404).json({ message: "Not found" })

        const bucket = getBucket()
        const files = req.files || []

        const records = []
        for (const f of files) {
            //tạo stream từ buffer
            const readStream = Readable.from(f.buffer)

            //lưu vào gridFS
            const uploadStream = bucket.openUploadStream(f.originalname, {
                contentType: f.mimetype,
                metadata: { originalname: f.originalname }
            })

            //pipe buffer -> GridFS
            await new Promise((resolve, reject) => {
                readStream
                    .pipe(uploadStream)
                    .on("error", reject)
                    .on("finish", resolve)
            })

            const fileId = uploadStream.id //ObjectId
            records.push({
                gridfsFileId: fileId,
                filename: uploadStream.filename,
                originalname: f.originalname,
                mimetype: f.mimetype,
                size: f.size,
                url: `/api/images/${fileId.toString()}`
            })
        }

        product.images.push(...records)
        await product.save()
        res.status(201).json(product)
    } catch (e) {
        next(e)
    }
})

//xóa 1 ảnh của product (xóa DB + xóa GridFS)
router.delete("/:id/images/:fileId", async (req, res, next) => {
    try {
        const { id, fileId } = req.params
        const product = await Product.findById(id)
        if (!product) return res.status(404).json({ message: "Not found" })

        const oid = mongoose.Types.ObjectId.createFromHexString(String(fileId))

        const before = product.images.length
        product.images = product.images.filter((img) => img.gridfsFileId.toString() !== oid.toString())
        if (product.images.length === before)
            return res.status(404).json({ message: "Not found" })

        await product.save()

        const bucket = getBucket()
        await bucket.delete(oid)

        res.json(product)
    } catch (e) {
        next(e)
    }
})

module.exports = router