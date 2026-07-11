const Counter = require("../models/Counter");

async function getNextSequence(key) {
    const counter = await Counter.findOneAndUpdate(
        { _id: key },
        { $inc: { seq: 1 } },
        { new: true, upsert: true }
    );

    return counter.seq;
}

function formatNumber(number, length = 4) {
    return String(number).padStart(length, "0");
}

/* ================= CATEGORY ================= */
async function generateCategoryCode(prefix) {
    const key = `category-${prefix}`;
    const seq = await getNextSequence(key);
    return `${prefix}-${formatNumber(seq)}`;
}

/* ================= PRODUCT ================= */
/* ================= PRODUCT ================= */
async function generateProductCode(categoryCode) {
    // Nếu categoryCode không tồn tại, mặc định dùng "0000" để tránh lỗi slice
    const categoryNumber = (categoryCode && typeof categoryCode === 'string') 
        ? categoryCode.slice(-4) 
        : "0000";

    const key = `product-${categoryNumber}`;
    const seq = await getNextSequence(key);

    return `PRD-${categoryNumber}-${formatNumber(seq)}`;
}

/* ================= USER ================= */
async function generateUserCode(role) {
    const prefix = role === "admin" ? "AD" : "CUS";
    const key = `user-${role}`;

    const seq = await getNextSequence(key);

    return `${prefix}-${formatNumber(seq, 3)}`;
}

/* ================= ORDER ================= */
async function generateOrderCode() {
    const year = new Date().getFullYear();
    const key = `order-${year}`;

    const seq = await getNextSequence(key);

    return `ORD-${year}-${formatNumber(seq)}`;
}

/* ================= VOUCHER ================= */
async function generateVoucherCode(prefix = "", suffix = "") {
    const key = `voucher-${prefix}-${suffix}`;

    const seq = await getNextSequence(key);

    return `VCH-${prefix}-${formatNumber(seq)}-${suffix}`;
}

module.exports = {
    generateCategoryCode,
    generateProductCode,
    generateUserCode,
    generateOrderCode,
    generateVoucherCode
};