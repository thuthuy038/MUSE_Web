const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
  paymentMethod: {
    type: String,
    enum: ['COD', 'MOMO', 'VNPAY'],
    required: true
  },
  paymentStatus: {
    type: String,
    enum: ['Đã thanh toán', 'Chưa thanh toán'],
    default: 'Chưa thanh toán'
  },
  paymentDate: {
    type: Date,
    default: Date.now
  },
  orderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Order',
    required: true
  },
  amount: {
    type: Number,
    required: true
  },
  transactionId: {
    type: String,
    default: ''
  }
}, { timestamps: true });

module.exports = mongoose.model('Payment', paymentSchema);