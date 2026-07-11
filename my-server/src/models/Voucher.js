const mongoose = require('mongoose');

const VoucherSchema = new mongoose.Schema({
    code: {
        type: String,
        required: true,
        unique: true
    },

    promotionId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Promotion'
    },

    status: {
        type: String,
        enum: ['unused', 'used'],
        default: 'unused'
    },

    orderId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Order',
        default: null
    },

    usedDate: {
        type: Date,
        default: null
    }

}, { timestamps: true });

module.exports = mongoose.model('Voucher', VoucherSchema);