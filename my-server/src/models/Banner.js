const mongoose = require("mongoose")

const bannerSchema = new mongoose.Schema({

  title: {
    type: String,
    required: true
  },

  image: {
    type: mongoose.Schema.Types.ObjectId,
    required: true
  },

  status: {
    type: String,
    default: "active"
  },

  createdAt: {
    type: Date,
    default: Date.now
  }

})

module.exports = mongoose.model("Banner", bannerSchema)