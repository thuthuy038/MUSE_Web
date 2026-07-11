const express = require('express');
const router = express.Router();
const Notification = require('../models/Notification');
const { protect, admin } = require('../../middleware/auth');

// ======================
// LẤY DANH SÁCH THÔNG BÁO
// ======================
router.get('/', protect, admin, async (req, res) => {
    try {
        const notifications = await Notification.find()
            .sort({ createdAt: -1 })
            .limit(50);

        const unreadCount = await Notification.countDocuments({ status: 'unread' });

        res.json({
            data: notifications,
            unreadCount: unreadCount,
            total: notifications.length
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ======================
// ĐÁNH DẤU ĐÃ ĐỌC
// ======================
router.put('/:id/read', protect, admin, async (req, res) => {
    try {
        const notification = await Notification.findByIdAndUpdate(
            req.params.id,
            { status: 'read', readAt: new Date() },
            { new: true }
        );
        res.json(notification);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ======================
// ĐÁNH DẤU TẤT CẢ ĐÃ ĐỌC
// ======================
router.put('/read-all', protect, admin, async (req, res) => {
    try {
        await Notification.updateMany(
            { status: 'unread' },
            { status: 'read', readAt: new Date() }
        );
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ======================
// XÓA THÔNG BÁO
// ======================
router.delete('/:id', protect, admin, async (req, res) => {
    try {
        await Notification.findByIdAndDelete(req.params.id);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ======================
// TẠO THÔNG BÁO (Dùng cho các sự kiện)
// ======================
const createNotification = async (title, message, type, targetId = null) => {
    try {
        const notification = new Notification({
            title,
            message,
            type,
            targetId,
            status: 'unread'
        });
        await notification.save();
        console.log(`[Notification] Đã tạo: ${title}`);
        return notification;
    } catch (err) {
        console.error('Lỗi tạo thông báo:', err);
        return null;
    }
};

// Export cả router và createNotification
module.exports = router; // Export router trực tiếp
module.exports.createNotification = createNotification;