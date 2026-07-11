const express = require("express")
const router = express.Router()
const Blog = require("../models/Blog")

// GET ALL BLOG
router.get("/", async (req, res) => {
    try {

        const blogs = await Blog.find().sort({ date: -1 })
        res.json(blogs)

    } catch (err) {
        res.status(500).json({ message: err.message })
    }
})

// GET BLOG BY ID
router.get("/:id", async (req, res) => {
    try {

        const blog = await Blog.findById(req.params.id)

        if (!blog) {
            return res.status(404).json({ message: "Blog not found" })
        }

        res.json(blog)

    } catch (err) {
        res.status(500).json({ message: err.message })
    }
})

// CREATE BLOG
router.post("/", async (req, res) => {
    try {

        const blog = new Blog(req.body)
        await blog.save()

        res.json(blog)

    } catch (err) {
        res.status(500).json({ message: err.message })
    }
})

// UPDATE BLOG
router.put("/:id", async (req, res) => {
    try {

        await Blog.findByIdAndUpdate(req.params.id, req.body)

        res.json({ message: "updated" })

    } catch (err) {
        res.status(500).json({ message: err.message })
    }
})

// DELETE BLOG
router.delete("/:id", async (req, res) => {
    try {

        await Blog.findByIdAndDelete(req.params.id)

        res.json({ message: "deleted" })

    } catch (err) {
        res.status(500).json({ message: err.message })
    }
})

module.exports = router