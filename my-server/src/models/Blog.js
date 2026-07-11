const mongoose = require("mongoose")

const blogSchema = new mongoose.Schema({
  title: String,
  content: String,
  image: String,
  date: String,
  author: String
})

module.exports = mongoose.model("Blog", blogSchema, "blogs")