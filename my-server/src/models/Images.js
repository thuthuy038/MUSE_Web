const mongoose = require("mongoose")

const ImageSchema = new mongoose.Schema(
{
  gridfsFileId: { type: mongoose.Schema.Types.ObjectId, required: false },
  filename: { type: String, required: false },
  originalname: { type: String, default: "" },
  mimetype: { type: String, default: "" },
  size: { type: Number, default: 0 },
  url: { type: String, default: "" }
},
{ _id:false }
)

module.exports = ImageSchema