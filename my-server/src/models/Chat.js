const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  sender: { 
    type: String, 
    enum: ['admin', 'customer', 'guest'], 
    required: true 
  },
  content: { 
    type: String, 
    default: '' 
  },
  // QUAN TRỌNG: Thêm trường này để lưu chuỗi Base64 của ảnh
  image: { 
    type: String, 
    default: null 
  },
  timestamp: { 
    type: Date, 
    default: Date.now 
  }
});

const chatSchema = new mongoose.Schema({
  customerId: { 
    type: String, 
    required: true, 
    index: true 
  }, // Mã CUS-2026-xxxx hoặc GUEST-xxxx
  customerName: { 
    type: String, 
    default: 'Khách hàng Muse' 
  }, // Thêm để hiển thị tên ở sidebar
  avatar: { 
    type: String, 
    default: '' 
  }, // Thêm để hiện ảnh đại diện khách
  messages: [messageSchema],
  lastMessage: { 
    type: String, 
    default: '' 
  }
}, { timestamps: true });

// Tránh lỗi OverwriteModelError khi nodemon restart
module.exports = mongoose.models.Chat || mongoose.model('Chat', chatSchema);
