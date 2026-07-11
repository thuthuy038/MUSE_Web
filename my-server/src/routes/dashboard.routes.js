const express = require('express');
const router = express.Router();
const Order = require('../models/Order');
const Product = require('../models/Product');
const User = require('../models/User');
const Review = require('../models/Review');
const Promotion = require('../models/Promotion');
const { protect, admin } = require('../../middleware/auth');

// ======================
// 1. TỔNG QUAN KPI
// ======================
router.get('/overview', protect, admin, async (req, res) => {
    try {
        const today = new Date();
        const startOfDay = new Date(today.setHours(0, 0, 0, 0));
        const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
        const startOfYear = new Date(today.getFullYear(), 0, 1);

        // 1. Đơn hàng
        const totalOrders = await Order.countDocuments();
        const todayOrders = await Order.countDocuments({
            createdAt: { $gte: startOfDay }
        });
        const monthOrders = await Order.countDocuments({
            createdAt: { $gte: startOfMonth }
        });

        // 2. Doanh thu
        const orders = await Order.find({ status: 'Đã giao' });
        const totalRevenue = orders.reduce((sum, o) => sum + (o.totalPrice || 0), 0);

        const todayRevenue = orders
            .filter(o => o.createdAt >= startOfDay)
            .reduce((sum, o) => sum + (o.totalPrice || 0), 0);

        const monthRevenue = orders
            .filter(o => o.createdAt >= startOfMonth)
            .reduce((sum, o) => sum + (o.totalPrice || 0), 0);

        // 3. Sản phẩm
        const totalProducts = await Product.countDocuments();
        const outOfStock = await Product.countDocuments({ stock: 0 });
        const lowStock = await Product.countDocuments({
            stock: { $gt: 0, $lte: 10 }
        });

        // 4. Người dùng
        const totalUsers = await User.countDocuments({ role: 'customer' });
        const newUsersMonth = await User.countDocuments({
            role: 'customer',
            createdAt: { $gte: startOfMonth }
        });

        // 5. Đánh giá
        const totalReviews = await Review.countDocuments();
        const avgRating = await Review.aggregate([
            { $group: { _id: null, avg: { $avg: '$rating' } } }
        ]);

        res.json({
            orders: {
                total: totalOrders,
                today: todayOrders,
                month: monthOrders
            },
            revenue: {
                total: totalRevenue,
                today: todayRevenue,
                month: monthRevenue
            },
            products: {
                total: totalProducts,
                outOfStock,
                lowStock
            },
            users: {
                total: totalUsers,
                newThisMonth: newUsersMonth
            },
            reviews: {
                total: totalReviews,
                averageRating: avgRating[0]?.avg?.toFixed(1) || 0
            }
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ======================
// 2. BIỂU ĐỒ DOANH THU 7 NGÀY
// ======================
router.get('/revenue-chart', protect, admin, async (req, res) => {
    try {
        const days = 7;
        const result = [];

        for (let i = days - 1; i >= 0; i--) {
            const date = new Date();
            date.setDate(date.getDate() - i);
            date.setHours(0, 0, 0, 0);

            const nextDate = new Date(date);
            nextDate.setDate(nextDate.getDate() + 1);

            const dayOrders = await Order.find({
                status: 'Đã giao',
                createdAt: { $gte: date, $lt: nextDate }
            });

            const revenue = dayOrders.reduce((sum, o) => sum + (o.totalPrice || 0), 0);
            const orderCount = dayOrders.length;

            // ✅ FIX: Format date theo giờ local, không dùng toISOString()
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');
            const localDate = `${year}-${month}-${day}`;

            result.push({
                date: localDate,  // Dùng date đã format theo local
                revenue,
                orders: orderCount
            });
        }

        res.json(result);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ======================
// 3. TOP SẢN PHẨM BÁN CHẠY
// ======================
router.get('/top-products', protect, admin, async (req, res) => {
    try {
        const { limit = 5 } = req.query;

        // ✅ Lấy top sản phẩm trực tiếp từ Product (dùng sold)
        const topProducts = await Product.find()
            .sort({ sold: -1 })
            .limit(parseInt(limit))
            .select('name code sold price images');

        // ✅ Format kết quả
        const result = topProducts.map(p => ({
            _id: p._id,
            name: p.name,
            totalSold: p.sold || 0,
            revenue: (p.sold || 0) * (p.price - (p.price * (p.discountPercent || 0) / 100)),
            code: p.code,
            image: p.images?.[0]?.url
                ? `http://localhost:3000${p.images[0].url}`
                : null
        }));

        res.json(result);
    } catch (err) {
        console.error('Lỗi get top-products:', err);
        res.status(500).json({ error: err.message });
    }
});

// ======================
// 4. ĐƠN HÀNG GẦN ĐÂY
// ======================
router.get('/recent-orders', protect, admin, async (req, res) => {
    try {
        const recentOrders = await Order.find()
            .sort({ createdAt: -1 })
            .limit(5)
            .select('id customerName totalPrice status createdAt');

        res.json(recentOrders);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ======================
// 5. ĐÁNH GIÁ GẦN ĐÂY
// ======================
router.get('/recent-reviews', protect, admin, async (req, res) => {
    try {
        const recentReviews = await Review.find({ status: 'pending' })
            .populate('userId', 'name')
            .populate('productId', 'name images')
            .sort({ createdAt: -1 })
            .limit(5)
            .lean();

        const formatted = recentReviews.map(r => ({
            _id: r._id,
            customerName: r.userId?.name || 'Khách vãng lai',
            productName: r.productId?.name,
            productImage: r.productId?.images?.[0]?.url
                ? `http://localhost:3000${r.productId.images[0].url}`
                : null,
            rating: r.rating,
            content: r.content?.substring(0, 50) + '...',
            createdAt: r.createdAt
        }));

        res.json(formatted);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ======================
// 6. THÔNG BÁO & CẢNH BÁO
// ======================
router.get('/alerts', protect, admin, async (req, res) => {
    try {
        const today = new Date();
        const nextWeek = new Date();
        nextWeek.setDate(nextWeek.getDate() + 7);

        // Sản phẩm sắp hết hàng
        const lowStockProducts = await Product.find({
            stock: { $gt: 0, $lte: 5 }
        }).select('name code stock images').limit(5);

        // ✅ THÊM: Sản phẩm đã hết hàng (stock = 0)
        const outOfStockProducts = await Product.find({
            stock: 0
        }).select('name code stock images').limit(5);

        // Khuyến mãi sắp kết thúc
        const expiringPromotions = await Promotion.find({
            status: 'active',
            endDate: { $gte: today, $lte: nextWeek }
        }).select('name code endDate');

        // Đơn hàng chưa xử lý
        const pendingOrders = await Order.countDocuments({
            status: 'Đang xử lý'
        });

        // Đánh giá chờ duyệt
        const pendingReviews = await Review.countDocuments({
            status: 'pending'
        });

        res.json({
            lowStock: lowStockProducts.map(p => ({
                _id: p._id,
                name: p.name,
                code: p.code,
                stock: p.stock,
                image: p.images?.[0]?.url ? `http://localhost:3000${p.images[0].url}` : null
            })),
            expiringPromotions: expiringPromotions.map(p => ({
                _id: p._id,
                name: p.name,
                code: p.code,
                endDate: p.endDate
            })),
            pendingOrders,
            pendingReviews
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;