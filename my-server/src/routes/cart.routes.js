const express = require('express');
const router = express.Router();
const Cart = require('../models/Cart');
const Promotion = require('../models/Promotion'); 
const Voucher = require('../models/Voucher');     

// API: Lấy giỏ hàng kèm Ảnh, Đơn giá và Voucher hợp lệ
router.get('/:userId', async (req, res) => {
  try {
    // Populate để lấy thông tin từ collection products (ảnh, tên, giá gốc)
    const cart = await Cart.findOne({ userId: req.params.userId });
    
    if (!cart) {
      return res.json({ items: [], subTotal: 0, eligibleVouchers: [], activePromotions: [] });
    }

    // 1. Tính toán Tạm tính (subTotal) để đối chiếu điều kiện
    let subTotal = cart.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);

    // 2. Lấy các Promotion đang hoạt động để gửi thông báo
    const activePromotions = await Promotion.find({ 
      status: 'active',
      startDate: { $lte: new Date() },
      endDate: { $gte: new Date() }
    });

    // 3. Lấy Voucher và đối chiếu điều kiện minOrderValue từ Promotion liên kết
    const allVouchers = await Voucher.find({ status: 'unused' }).populate('promotionId');
    
    const eligibleVouchers = allVouchers.filter(v => {
      // Kiểm tra điều kiện trong mảng conditions của Promotion
      const condition = v.promotionId?.conditions?.[0];
      return !condition || subTotal >= (condition.minOrderValue || 0);
    });

    // Trả về dữ liệu chuẩn để Frontend hiển thị
    res.json({
      items: cart.items.map(item => ({
        ...item.toObject(),
        id: item.productId // Đổi tên để khớp với ICartItem ở Frontend
      })),
      subTotal,
      eligibleVouchers,
      // Gửi kèm tên Promotion để hiện dòng thông báo hồng
      promotionMessages: activePromotions.map(p => p.name) 
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// API: Thêm vào giỏ (Giữ nguyên logic cũ của Ngoc)
router.post('/add', async (req, res) => {
  try {
    const { userId, productId, name, image, size, color, quantity, price } = req.body;
    let cart = await Cart.findOne({ userId });

    if (cart) {
      const itemIndex = cart.items.findIndex(p => 
        p.productId === productId && p.size === size && p.color === color
      );

      if (itemIndex > -1) {
        cart.items[itemIndex].quantity += quantity;
      } else {
        cart.items.push({ productId, name, image, size, color, quantity, price });
      }
      cart = await cart.save();
      return res.status(200).json(cart);
    } else {
      const newCart = await Cart.create({
        userId,
        items: [{ productId, name, image, size, color, quantity, price }]
      });
      return res.status(201).json(newCart);
    }
  } catch (err) {
    res.status(500).json({ error: "Lỗi Server: " + err.message });
  }
});

// API: Xóa sản phẩm
router.delete('/remove/:userId/:productId/:size/:color', async (req, res) => {
  try {
    const { userId, productId, size, color } = req.params;
    let cart = await Cart.findOne({ userId });
    if (cart) {
      cart.items = cart.items.filter(item => 
        !(item.productId === productId && item.size === size && item.color === color)
      );
      await cart.save();
    }
    res.json(cart);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Merge cart
router.post('/merge', async (req, res) => {
  try {
    const { guestId, userId } = req.body;
    if (!guestId || !userId) {
      return res.status(400).json({ error: 'Missing guestId or userId' });
    }
    const guestCart = await Cart.findOne({ userId: guestId });
    if (!guestCart) {
      return res.json({ message: 'No guest cart to merge' });
    }
    let userCart = await Cart.findOne({ userId });
    if (!userCart) {
      guestCart.userId = userId;
      await guestCart.save();
      userCart = guestCart;
    } else {
      for (const guestItem of guestCart.items) {
        const existingIndex = userCart.items.findIndex(i => 
          i.productId === guestItem.productId && i.size === guestItem.size && i.color === guestItem.color
        );
        if (existingIndex > -1) {
          userCart.items[existingIndex].quantity += guestItem.quantity;
        } else {
          userCart.items.push(guestItem);
        }
      }
      await userCart.save();
      await Cart.deleteOne({ userId: guestId });
    }
    res.json(userCart);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;