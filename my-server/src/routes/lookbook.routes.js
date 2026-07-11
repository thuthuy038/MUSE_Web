const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const Lookbook = require("../models/Lookbook"); 

let Product;
if (mongoose.models.Product) {
    Product = mongoose.model("Product");
} else {
    Product = require("../models/Product"); 
}

/** 1. Lấy danh sách cho ADMIN */
router.get("/", async (req, res) => {
    try {
        const list = await Lookbook.find()
            .populate("mainProductId", "name code images")
            .populate("matchingItems", "name images")
            .lean();
        res.json(list);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

/** 2. HÀM CỨU TINH CHO CLIENT: Lấy gợi ý phối đồ */
// Nàng thiếu đoạn này nè nên Frontend mới không hiện được gì đó!
router.get("/recommend/:productId", async (req, res) => {
    try {
        const suggestion = await Lookbook.findOne({ mainProductId: req.params.productId })
            .populate({
                path: "matchingItems",
                select: "name price images discountPercent" 
            })
            .lean();

        if (!suggestion) return res.json({ matchingItems: [] });
        res.json(suggestion);
    } catch (err) {
        console.error("Lỗi Get Recommend:", err);
        res.status(500).json({ error: err.message });
    }
});

/** 3. Lưu phối đồ (POST) */
router.post("/", async (req, res) => {
    try {
        const { mainProductId, mainProductName, mainProductCode, matchingItems, matchingItemNames } = req.body;
        const mainSet = await Lookbook.findOneAndUpdate(
            { mainProductId: mainProductId },
            { mainProductName, mainProductCode, matchingItems, matchingItemNames, title: `Set phối cho ${mainProductName}` },
            { upsert: true, new: true }
        );

        if (matchingItems && matchingItems.length > 0) {
            const updatePromises = matchingItems.map(async (itemId, index) => {
                return Lookbook.findOneAndUpdate(
                    { mainProductId: itemId },
                    { 
                        $addToSet: { matchingItems: mainProductId, matchingItemNames: mainProductName },
                        $setOnInsert: { mainProductName: matchingItemNames[index], mainProductCode: "", title: `Set phối cho ${matchingItemNames[index]}` }
                    },
                    { upsert: true }
                );
           });
            await Promise.all(updatePromises);
        }
        res.json({ message: "✨ Đã liên kết 2 chiều thành command!", data: mainSet });
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

/** 4. Xóa set đồ (DELETE) */
router.delete("/:id", async (req, res) => {
    try {
        await Lookbook.findByIdAndDelete(req.params.id);
        res.json({ message: "Đã xóa set thành công!" });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;