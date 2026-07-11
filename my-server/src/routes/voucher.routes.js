const express = require('express');
const router = express.Router();

const Voucher = require('../models/Voucher');

// router.get('/', async (req, res) => {
//     try {
//         const vouchers = await Voucher.find().sort({ createdAt: -1 });
//         res.json(vouchers);
//     } catch (err) {
//         res.status(500).json({ message: err.message });
//     }
// });

// ======================
// GET BY PROMOTION
// ======================
router.get('/promotion/:promotionId', async (req, res) => {
    try {
        const vouchers = await Voucher.find({
            promotionId: req.params.promotionId
        });

        res.json(vouchers);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});


// ======================
// APPLY VOUCHER
// ======================
router.post('/apply', async (req, res) => {
    try {
        const { code, orderId } = req.body;

        const voucher = await Voucher.findOne({ code });

        if (!voucher) {
            return res.status(400).json({ message: 'Voucher không tồn tại' });
        }

        if (voucher.status === 'used') {
            return res.status(400).json({ message: 'Voucher đã được sử dụng' });
        }

        const Promotion = require('../models/Promotion');
        const Order = require('../models/Order');

        const promotion = await Promotion.findById(voucher.promotionId);
        const order = await Order.findById(orderId);

        const now = new Date();

        if (!promotion || promotion.status !== 'active') {
            return res.status(400).json({ message: 'Khuyến mãi không hợp lệ' });
        }

        if (now < promotion.startDate || now > promotion.endDate) {
            return res.status(400).json({ message: 'Voucher đã hết hạn' });
        }

        const condition = promotion.conditions[0];

        if (condition?.minOrderValue && order.price < condition.minOrderValue) {
            return res.status(400).json({
                message: `Đơn hàng phải từ ${condition.minOrderValue}`
            });
        }

        const usedVoucher = await Voucher.findOne({ orderId });

        if (usedVoucher) {
            return res.status(400).json({
                message: 'Đơn hàng đã sử dụng voucher'
            });
        }

        voucher.status = 'used';
        voucher.orderId = orderId;
        voucher.usedDate = new Date();

        await voucher.save();

        res.json({ message: 'Áp dụng thành công', voucher });

    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

module.exports = router;