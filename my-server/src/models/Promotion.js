const mongoose = require('mongoose');

const PromotionConditionSchema = new mongoose.Schema({
    // ORDER
    minOrderValue: Number,

    // PRODUCT
    buyProductId: String,
    buyQuantity: Number,

    // DISCOUNT
    discountValue: Number,
    discountType: {
        type: String,
        enum: ['percent', 'vnd']
    },

    // GIFT
    giftProductId: String,
    giftQuantity: Number
}, { _id: false });

const VoucherSchema = new mongoose.Schema({
    quantity: Number,
    prefix: String,
    suffix: String
}, { _id: false });

const PromotionSchema = new mongoose.Schema({

    code: {
        type: String,
        required: true,
        unique: true
    },
    name: {
        type: String,
        required: true
    },
    status: {
        type: String,
        enum: ['active', 'inactive'],
        default: 'active'
    },
    promotionType: {
        type: String,
        enum: ['order', 'product'],
        required: true
    },
    promotionMethod: {
        type: String,
        enum: [
            'discountOrder',
            'giftOrder',
            'buyXGetY',
            'quantityDiscount'
        ],
        required: true
    },
    startDate: Date,
    endDate: Date,
    // optional
    applyBirthday: Boolean,
    conditions: [PromotionConditionSchema],
    voucher: VoucherSchema,
    notCombineOther: {
        type: Boolean,
        default: false
    }
}, { timestamps: true });

module.exports = mongoose.model('Promotion', PromotionSchema);