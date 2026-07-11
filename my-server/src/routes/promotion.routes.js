const express = require('express')
const router = express.Router()
const Counter = require('../models/Counter');

const Promotion = require('../models/Promotion')
const Voucher = require('../models/Voucher');


// ======================
// GET ALL
// ======================

router.get('/', async (req, res) => {
    try {
        const promotions = await Promotion.find().sort({ createdAt: -1 })
        res.json(promotions)
    } catch (err) {
        res.status(500).json({ message: err.message })
    }
})


// ======================
// GET BY ID
// ======================

router.get('/:id', async (req, res) => {
    try {
        const promotion = await Promotion.findById(req.params.id)
        res.json(promotion)
    } catch (err) {
        res.status(500).json({ message: err.message })
    }
})

// ======================
// CREATE
// ======================

router.post('/', async (req, res) => {
    try {

        console.log("========== CREATE PROMOTION ==========");
        console.log("REQ BODY:", req.body);
        console.log("VOUCHER:", req.body.voucher);

        const year = new Date().getFullYear();
        const key = `promotion_${year}`;

        const counter = await Counter.findOneAndUpdate(
            { _id: key },
            { $inc: { seq: 1 } },
            { new: true, upsert: true }
        );

        const number = String(counter.seq).padStart(4, '0');
        const code = `PRM-${year}-${number}`;

        const promotion = new Promotion({
            ...req.body,
            code
        })
        const saved = await promotion.save()

        // =========================
        // 🔥 TẠO VOUCHER REAL
        // =========================
        if (req.body.voucher?.quantity > 0) {

            const { quantity, prefix = '', suffix = '' } = req.body.voucher;

            const vouchers = [];

            for (let i = 0; i < quantity; i++) {
                const random = Math.random().toString(36).substring(2, 6).toUpperCase();

                vouchers.push({
                    code: `${prefix}${random}${suffix}`,
                    promotionId: saved._id,
                    status: 'unused',
                    orderId: null,
                    usedDate: null
                });
            }

            await Voucher.insertMany(vouchers);
        }

        res.json(saved)
    } catch (err) {
        res.status(500).json({ message: err.message })
    }
})


// ======================
// UPDATE
// ======================

router.put('/:id', async (req, res) => {
    try {
        const promotion = await Promotion.findByIdAndUpdate(
            req.params.id,
            req.body,
            { new: true }
        )
        if (req.body.voucher?.quantity > 0) {

            const { quantity, prefix = '', suffix = '' } = req.body.voucher;

            // ❗ XÓA voucher cũ
            await Voucher.deleteMany({
                promotionId: promotion._id
            });

            const vouchers = [];

            for (let i = 0; i < quantity; i++) {
                const random = Math.random().toString(36).substring(2, 6).toUpperCase();

                vouchers.push({
                    code: `${prefix}${random}${suffix}`,
                    promotionId: promotion._id,
                    status: 'unused',
                    orderId: null,
                    usedDate: null
                });
            }

            await Voucher.insertMany(vouchers);
        }
        res.json(promotion)
    } catch (err) {
        res.status(500).json({ message: err.message })
    }
})

// ======================
// DELETE
// ======================

router.delete('/:id', async (req, res) => {
    try {
        await Promotion.findByIdAndDelete(req.params.id)
        res.json({ message: "Promotion deleted" })
    } catch (err) {
        res.status(500).json({ message: err.message })
    }
})

module.exports = router