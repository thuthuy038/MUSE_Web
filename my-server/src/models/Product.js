const mongoose = require("mongoose")
const ImageSchema = require("./Images")
const { generateProductCode } = require("../utils/codeGenerator");

const ProductSchema = new mongoose.Schema(
    {
        code: { type: String, unique: true, trim: true },
        name: { type: String, required: true, trim: true },
        category: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Category", 
            required: true
        },
        price: { type: Number, default: 0, min: 0 },
        discountPercent: { type: Number, default: 0 },
        variants: {
            type: [
                {
                    size: String,
                    color: String,
                    quantity: { type: Number, default: 0 },
                }
            ],
            default: []
        },
        stock: { type: Number, default: 0 },
        sold: { type: Number, default: 0, min: 0 },
        status: {
            type: String,
            enum: ["active", "featured", "disabled"],
            default: "active"
        },
        description: { type: String, default: "" },
        material: { type: String, default: "" },
        images: { type: [ImageSchema], default: [] },
        isNew: { type: Boolean, default: false },
        isBestSeller: { type: Boolean, default: false },
        rating: { type: Number, default: 0 }, 
        reviewCount: { type: Number, default: 0 }, 
        createdAt: { type: Date, default: Date.now },
        updatedAt: { type: Date, default: Date.now }
    },
    { timestamps: true }
)

ProductSchema.pre("save", async function () {
    if (!this.code) {
        this.code = await generateProductCode();
    }
});

module.exports = mongoose.model("Product", ProductSchema)