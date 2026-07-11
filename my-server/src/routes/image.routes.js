const router = require("express").Router()
const mongoose = require("mongoose")
const { getBucket } = require("../services/gridfs")

router.get("/:fileId", async (req, res, next) => {
    try {
        const bucket = getBucket()
        const fileId = mongoose.Types.ObjectId.createFromHexString(
            String(req.params.fileId)
        )

        const files = await mongoose.connection.db
            .collection(`${process.env.GRIDFS_BUCKET || "fs"}.files`)
            .find({ _id: fileId })
            .toArray()

        if (!files.length)
            return res.status(404).json({ message: "File not found" })

        res.set("Content-Type", files[0].contentType || "image/jpeg") //application/octet-stream
        
        bucket.openDownloadStream(fileId).pipe(res).on("error", next)
    } catch (e) {
        next(e)

    }
})

module.exports = router
