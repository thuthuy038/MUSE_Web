const mongoose = require('mongoose');
const ImageSchema = require('./Images');
const Schema = mongoose.Schema;
const { generateCategoryCode } = require("../utils/codeGenerator");

const Category = new Schema({
  code: { type: String, unique: true, trim: true },
  name: { type: String, required: true, trim: true },

  url: { type: String, default: "" },
  externalLink: { type: String, default: "" },
  description: { type: String, default: "" },
  banner: { type: [ImageSchema], default: [] },


  status: {
    type: String,
    enum: ["active", "inactive", "featured"],
    default: "active"
  },

  type: {
    type: String,
    enum: ["category", "collection"],
    default: "category"
  },

  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
}, { timestamps: true });


Category.pre("save", async function () {
  try {
    if (!this.code) {
      const prefix = this.type === 'category' ? 'CAT' : 'COL';
      this.code = await generateCategoryCode(prefix);
    }
  } catch (error) {
    console.error("Lỗi tại middleware generateCategoryCode:", error);
    throw error;
  }
});

module.exports = mongoose.model("Category", Category);