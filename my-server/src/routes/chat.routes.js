const express = require('express');
const router = express.Router();
const Chat = require('../models/Chat');
const Order = require('../models/Order'); // Import model Order để cập nhật ghi chú

// Lấy tất cả chat
router.get('/', async (req, res) => {
  try {
    const chats = await Chat.find().sort({ updatedAt: -1 });
    res.status(200).json(chats);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Lỗi Server" });
  }
});

// Gửi tin nhắn
router.post('/send', async (req, res) => {
  const { content, customerId, sender, customerName, image } = req.body;
  try {
    let chat = await Chat.findOne({ customerId: customerId });
    if (!chat) {
      chat = new Chat({ customerId, customerName, messages: [] });
    }
    chat.messages.push({ sender, content, image, timestamp: new Date() });
    chat.lastMessage = content || '[Hình ảnh]'; // Cập nhật tin nhắn cuối
    // updatedAt sẽ tự động cập nhật nhờ timestamps: true
    await chat.save();
    res.status(200).json(chat);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Lỗi gửi" });
  }
});

// Cập nhật ghi chú đơn hàng (dùng trong live-chat)
router.put('/update-order-note/:id', async (req, res) => {
  try {
    const { note } = req.body;
    const order = await Order.findByIdAndUpdate(
      req.params.id,
      { note },
      { new: true }
    );
    if (!order) return res.status(404).json({ message: "Không tìm thấy đơn hàng" });
    res.json(order);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Lỗi cập nhật ghi chú" });
  }
});

module.exports = router;