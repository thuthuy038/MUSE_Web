const mongoose = require('mongoose');

const cartSchema = new mongoose.Schema({
  userId: { type: String, required: true }, // Thay thành String nếu bạn dùng ID giả để test
  items: [{
    productId: { type: String, required: true },
    name: String,
    image: String,
    size: String,
    color: String,
    quantity: { type: Number, default: 1 },
    price: { type: Number, required: true }
  }],
  subTotal: { type: Number, default: 0 }
}, { timestamps: true });

module.exports = mongoose.model('Cart', cartSchema);