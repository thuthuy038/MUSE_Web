const express = require("express")
const router = express.Router()
const mongoose = require("mongoose")
const Banner = require("../models/Banner")

// ==============================
// GET ALL BANNERS
// ==============================
router.get("/", async (req, res) => {
  try {

    const banners = await Banner.find().sort({ createdAt: -1 })

    const result = banners.map(b => ({
      ...b.toObject(),
      image: b.image ? b.image.toString() : null
    }))

    res.json(result)

  } catch (err) {

    res.status(500).json({ error: err.message })

  }
})


// ==============================
// GET BANNER BY ID
// ==============================
router.get("/:id", async (req, res) => {
  try {

    const banner = await Banner.findById(req.params.id)

    if (!banner)
      return res.status(404).json({ message: "Banner not found" })

    res.json({
      ...banner.toObject(),
      image: banner.image ? banner.image.toString() : null
    })

  } catch (err) {

    res.status(500).json({ error: err.message })

  }
})


// ==============================
// CREATE BANNER
// ==============================
router.post("/", async (req, res) => {
  try {

    const banner = new Banner({
      title: req.body.title,
      image: new mongoose.Types.ObjectId(req.body.image),
      status: req.body.status || "active"
    })

    await banner.save()

    res.json({
      message: "Banner created",
      banner
    })

  } catch (err) {

    res.status(500).json({ error: err.message })

  }
})


// ==============================
// UPDATE BANNER
// ==============================
router.put("/:id", async (req, res) => {
  try {

    if (req.body.image) {
      req.body.image = new mongoose.Types.ObjectId(req.body.image)
    }

    const banner = await Banner.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    )

    if (!banner)
      return res.status(404).json({ message: "Banner not found" })

    res.json(banner)

  } catch (err) {

    res.status(500).json({ error: err.message })

  }
})


// ==============================
// DELETE BANNER
// ==============================
router.delete("/:id", async (req, res) => {
  try {

    const banner = await Banner.findByIdAndDelete(req.params.id)

    if (!banner)
      return res.status(404).json({ message: "Banner not found" })

    res.json({ message: "Banner deleted successfully" })

  } catch (err) {

    res.status(500).json({ error: err.message })

  }
})

module.exports = router