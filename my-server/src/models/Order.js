const mongoose = require('mongoose');

function generateOrderID() {
  const year = new Date().getFullYear();
  const random = Math.floor(100000 + Math.random() * 900000);
  return `ORD-${year}-${random}`;
}

const orderSchema = new mongoose.Schema({
  id: { type: String, default: generateOrderID, unique: true },
  customerId: String,
  userId: { type: String },
  customerName: String,
  shippingAddress: {
    fullName: String,
    email: String,
    phone: String,
    address: String,
    city: String,
    district: String,
    ward: String
  },
  items: [{
    productId: String,
    name: String,
    image: String,
    quantity: Number,
    price: Number,
    size: String,
    color: String
  }],
  shippingMethod: {
    name: { type: String, default: "Giao hàng tiêu chuẩn" },
    fee: { type: Number, default: 0 }
  },
  paymentId: {
  type: mongoose.Schema.Types.ObjectId,
  ref: 'Payment'
},
  promotion: {
    code: { type: String, default: "" },
    discountAmount: { type: Number, default: 0 }
  },
  subTotal: Number,
  totalPrice: Number,
  note: String,
  status: {
    type: String,
    enum: ['Đang xử lý', 'Đang giao', 'Đã giao', 'Đã hủy', 'Yêu cầu trả hàng', 'Đang trả hàng', 'Đã trả hàng', 'Từ chối trả hàng'],
    default: 'Đang xử lý'
  },
  returnEmail: { type: String, default: "" },
  returnReason: { type: String, default: "" },
  returnMethod: { type: String, default: "" },
  returnNote: { type: String, default: "" },
  returnMedia: [{ type: String }],
  returnRequestedAt: { type: Date },
  returnProcessedAt: { type: Date },
}, { timestamps: true });

module.exports = mongoose.models.Order || mongoose.model('Order', orderSchema);