const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
    title: { type: String, required: true },
    message: { type: String, required: true },
    type: {
        type: String,
        enum: ['order', 'review', 'stock', 'promotion', 'system'],
        default: 'system'
    },
    status: {
        type: String,
        enum: ['unread', 'read'],
        default: 'unread'
    },
    targetId: { type: String, default: null }, // ID của đối tượng liên quan (orderId, productId...)
    createdAt: { type: Date, default: Date.now },
    readAt: { type: Date, default: null }
});

module.exports = mongoose.model('Notification', notificationSchema);