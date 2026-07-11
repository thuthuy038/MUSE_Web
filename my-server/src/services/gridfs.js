const mongoose = require("mongoose")

function getBucket() {
    const db = mongoose.connection.db
    if (!db) throw new Error("MongoDB not connected")
        return new mongoose.mongo.GridFSBucket(db, {
            bucketName: process.env.GRIDFS_BUCKET || "fs"
        })
}

module.exports = {getBucket}