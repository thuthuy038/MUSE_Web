const express = require("express");
const router = express.Router();
const axios = require("axios");

// lấy tỉnh
router.get("/provinces", async (req, res) => {
  try {
    const data = await axios.get("https://provinces.open-api.vn/api/p/");
    res.json(data.data);
  } catch (err) {
    res.status(500).json({ error: "Không lấy được tỉnh thành" });
  }
});

// lấy quận
router.get("/districts/:code", async (req, res) => {
  try {
    const data = await axios.get(
      `https://provinces.open-api.vn/api/p/${req.params.code}?depth=2`
    );
    res.json(data.data.districts);
  } catch (err) {
    res.status(500).json({ error: "Không lấy được quận" });
  }
});

// lấy phường
router.get("/wards/:code", async (req, res) => {
  try {
    const data = await axios.get(
      `https://provinces.open-api.vn/api/d/${req.params.code}?depth=2`
    );
    res.json(data.data.wards);
  } catch (err) {
    res.status(500).json({ error: "Không lấy được phường" });
  }
});

module.exports = router;