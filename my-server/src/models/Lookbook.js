const mongoose = require("mongoose");

const LookbookSchema = new mongoose.Schema({
    // Lưu ID để populate nếu cần, nhưng lưu thêm Name/Code để bảo hiểm
    mainProductId: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: "Product", 
        required: true 
    }, 
    mainProductName: { type: String, required: true }, // Tên sp chính
    mainProductCode: { type: String },               // Mã sp chính

    matchingItems: [{ 
        type: mongoose.Schema.Types.ObjectId, 
        ref: "Product" 
    }], 
    matchingItemNames: [{ type: String }],           // Mảng tên các sp phối kèm

    title: { type: String, default: "Set phối đồ" },
    description: String
}, { timestamps: true });

module.exports = mongoose.model("Lookbook", LookbookSchema);