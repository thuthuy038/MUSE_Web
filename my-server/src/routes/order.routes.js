const express = require('express');
const router = express.Router();
const Order = require('../models/Order');
const Product = require('../models/Product');
const { createNotification } = require('./notification.routes');
const Payment = require('../models/Payment');

// ======================
// Lấy tất cả đơn hàng
// ======================
router.get('/', async (req, res) => {
  try {
    const orders = await Order.find()
      .populate({
        path: 'paymentId',
        select: 'paymentStatus paymentMethod amount'
      })
      .sort({ createdAt: -1 });
    res.json(orders);
  } catch (err) {
    console.error('Lỗi khi lấy đơn hàng:', err);
    res.status(500).json({ error: err.message });
  }
});
// ======================
// Tạo đơn hàng mới
// ======================
router.post('/', async (req, res) => {
  try {
    const orderData = req.body;
    if (!orderData.id || orderData.id === '') delete orderData.id;

    // Lấy paymentMethod từ request (frontend gửi lên)
    const { paymentMethod, paymentStatus, totalPrice } = orderData;

    // Tạo order trước (chưa có paymentId)
    const newOrder = new Order(orderData);
    const savedOrder = await newOrder.save();

    // Tạo payment record
    const Payment = require('../models/Payment');
    const payment = new Payment({
      paymentMethod,
      paymentStatus: paymentStatus || 'Chưa thanh toán',
      orderId: savedOrder._id,
      amount: totalPrice,
      transactionId: '', // có thể để trống hoặc sinh random
    });

    const savedPayment = await payment.save();

    // Cập nhật order với paymentId
    savedOrder.paymentId = savedPayment._id;
    await savedOrder.save();

    // Cập nhật stock và sold cho từng sản phẩm
    if (savedOrder.items && savedOrder.items.length > 0) {
      console.log(`Cập nhật stock và sold cho ${savedOrder.items.length} sản phẩm...`);

      for (const item of savedOrder.items) {
        // 1. Tìm sản phẩm
        const product = await Product.findById(item.productId);

        if (product) {
          // 2. Tìm variant tương ứng với size và color
          const variant = product.variants.find(
            v => v.size === item.size && v.color === item.color
          );

          if (variant) {
            // 3. Giảm số lượng trong variant
            const newVariantQuantity = Math.max(0, variant.quantity - item.quantity);
            variant.quantity = newVariantQuantity;

            // 4. Cập nhật tổng stock
            const totalStock = product.variants.reduce((sum, v) => sum + v.quantity, 0);
            product.stock = totalStock;

            // 5. Tăng sold
            product.sold = (product.sold || 0) + item.quantity;

            // 6. Lưu thay đổi
            await product.save();

            console.log(`${product.name} (${item.color}/${item.size}):`);
            console.log(`- Số lượng còn trong variant: ${newVariantQuantity}`);
            console.log(`- Tổng stock: ${product.stock}`);
            console.log(`- Sold: ${product.sold}`);
          } else {
            console.log(`Không tìm thấy variant ${item.color}/${item.size} cho sản phẩm ${product.name}`);
          }
        } else {
          console.log(`Không tìm thấy sản phẩm ${item.productId}`);
        }
      }
    }
// TẠO THÔNG BÁO CHO ADMIN (Notification)
    await createNotification(
            'Đơn hàng mới',
            `Đơn hàng ${savedOrder.id} vừa được tạo bởi ${savedOrder.customerName || 'khách hàng'}`,
            'order',
            savedOrder._id
        );

   res.json(savedOrder);
  } catch (err) {
    console.error('Lỗi tạo đơn:', err);
    res.status(500).json({ error: err.message });
  }
});

// ======================
// Lấy đơn hàng theo userId
// ======================
router.get('/myorders/:userId', async (req, res) => {
  try {
    const userId = req.params.userId;
    const orders = await Order.find({ userId })
      .populate('paymentId')
      .sort({ createdAt: -1 })
      .lean();

    const Review = require('../models/Review');

    // Check if each order is reviewed
    const ordersWithReviewStatus = await Promise.all(orders.map(async (order) => {
      // Use Review.exists for efficient checking
      const reviewExists = await Review.exists({ orderId: order._id });
      return {
        ...order,
        isReviewed: !!reviewExists
      };
    }));

    res.json(ordersWithReviewStatus || []);
  } catch (err) {
    console.error('Error in /myorders/:userId', err);
    res.status(500).json({ error: err.message });
  }
});

// ======================
// Lấy chi tiết đơn hàng (Hỗ trợ cả ORD-xxx và ObjectId)
// ======================
router.get('/:id', async (req, res) => {
  try {
    let order;
    if (req.params.id.startsWith('ORD-')) {
      order = await Order.findOne({ id: req.params.id }).populate('paymentId');
    } else if (req.params.id.match(/^[0-9a-fA-F]{24}$/)) {
      order = await Order.findById(req.params.id).populate('paymentId');
    }
    if (!order) return res.status(404).json({ error: 'Order not found' });
    res.json(order);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ======================
// CẬP NHẬT ĐƠN HÀNG (Lưu thay đổi từ Order Form)
// ======================
router.put('/:id', async (req, res) => {
  try {
    const data = req.body;
    const orderUpdateData = { ...data };
    delete orderUpdateData.paymentStatus;

    let updatedOrder;
    let oldOrder;

    // Phân biệt loại ID
    if (req.params.id.startsWith('ORD-')) {
      oldOrder = await Order.findOne({ id: req.params.id });
      updatedOrder = await Order.findOneAndUpdate(
        { id: req.params.id },
        { $set: orderUpdateData }, // dùng orderUpdateData thay vì data
        { new: true }
      );
    } else if (req.params.id.match(/^[0-9a-fA-F]{24}$/)) {
      oldOrder = await Order.findById(req.params.id);
      updatedOrder = await Order.findByIdAndUpdate(
        req.params.id,
        { $set: orderUpdateData },
        { new: true }
      );
    } else {
      return res.status(400).json({ error: 'ID đơn hàng không hợp lệ' });
    }

    if (!updatedOrder) {
      return res.status(404).json({ error: 'Không tìm thấy đơn hàng' });
    }

    // Cập nhật payment nếu có thay đổi paymentStatus
    if (data.paymentStatus !== undefined && oldOrder && oldOrder.paymentId) {
      const Payment = require('../models/Payment');
      await Payment.findByIdAndUpdate(oldOrder.paymentId, { paymentStatus: data.paymentStatus });
    }


    // Kiểm tra nếu status chuyển thành "Đã giao"
    if (data.status === 'Đã giao' && oldOrder && oldOrder.status !== 'Đã giao') {
      console.log(`Đơn hàng ${updatedOrder.id} vừa được giao, cập nhật sold...`);

      for (const item of updatedOrder.items) {
        const product = await Product.findById(item.productId);

        if (product) {
          const variant = product.variants.find(
            v => v.size === item.size && v.color === item.color
          );

          if (variant) {
            const newVariantQuantity = Math.max(0, variant.quantity - item.quantity);
            variant.quantity = newVariantQuantity;

            product.stock = product.variants.reduce((sum, v) => sum + v.quantity, 0);

            product.sold = (product.sold || 0) + item.quantity;

            await product.save();

            console.log(`${product.name}: stock giảm ${item.quantity} → còn ${product.stock}, sold +${item.quantity}`);
          }
        }
      }
    }

    // Kiểm tra nếu status chuyển thành "Đã hủy" hoặc "Đã trả hàng"
    if ((data.status === 'Đã hủy' || data.status === 'Đã trả hàng') && oldOrder && oldOrder.status !== data.status) {
      console.log(`🔄 Đơn hàng ${updatedOrder.id} chuyển sang ${data.status} qua PUT, hoàn lại stock...`);
      
      for (const item of updatedOrder.items) {
        const product = await Product.findById(item.productId);
        
        if (product) {
          const variant = product.variants.find(
            v => v.size === item.size && v.color === item.color
          );
          
          if (variant) {
            // Tăng lại stock
            variant.quantity += item.quantity;
            product.stock = product.variants.reduce((sum, v) => sum + v.quantity, 0);
            
            // Giảm sold nếu đơn đã được tính
            if (oldOrder.status === 'Đã giao' || oldOrder.status === 'Yêu cầu trả hàng' || oldOrder.status === 'Đang trả hàng') {
              product.sold = Math.max(0, (product.sold || 0) - item.quantity);
            }
            
            await product.save();
            console.log(`Hoàn lại ${item.quantity} cho ${product.name}`);
          }
        }
      }
    }

     res.json(updatedOrder);
  } catch (err) { 
    console.error("Lỗi cập nhật:", err);
    res.status(500).json({ error: "Lỗi cập nhật đơn hàng", details: err.message });
  }
});

// ======================
// CẬP NHẬT TRẠNG THÁI ĐƠN HÀNG
// ======================
router.put('/:id/status', async (req, res) => {
  try {
    const { status } = req.body;
    console.log(`Cập nhật trạng thái đơn hàng ${req.params.id} thành: ${status}`);

    let updatedOrder;
    let oldOrder;

    // Phân biệt loại ID
    if (req.params.id.startsWith('ORD-')) {
      oldOrder = await Order.findOne({ id: req.params.id });
      updatedOrder = await Order.findOneAndUpdate(
        { id: req.params.id },
        { status },
        { new: true }
      );
    } 
    else if (req.params.id.match(/^[0-9a-fA-F]{24}$/)) {
      oldOrder = await Order.findById(req.params.id);
      updatedOrder = await Order.findByIdAndUpdate(
        req.params.id,
        { status },
        { new: true }
      );
    } else {
      return res.status(400).json({ error: 'ID đơn hàng không hợp lệ' });
    }

    if (!updatedOrder) {
      return res.status(404).json({ error: 'Không tìm thấy đơn hàng' });
    }

    // Nếu đơn hàng chuyển thành "Đã hủy" hoặc "Đã trả hàng"
    if ((status === 'Đã hủy' || status === 'Đã trả hàng') && oldOrder && oldOrder.status !== status) {
      console.log(`🔄 Đơn hàng ${updatedOrder.id} chuyển sang ${status}, hoàn lại stock...`);
      
      for (const item of updatedOrder.items) {
        const product = await Product.findById(item.productId);
        
        if (product) {
          const variant = product.variants.find(
            v => v.size === item.size && v.color === item.color
          );
          
          if (variant) {
            // Tăng lại stock
            variant.quantity += item.quantity;
            product.stock = product.variants.reduce((sum, v) => sum + v.quantity, 0);
            
            // Giảm sold nếu đơn đã được tính
            if (oldOrder.status === 'Đã giao' || oldOrder.status === 'Yêu cầu trả hàng' || oldOrder.status === 'Đang trả hàng') {
              product.sold = Math.max(0, (product.sold || 0) - item.quantity);
            }
            
            await product.save();
            console.log(`Hoàn lại ${item.quantity} cho ${product.name}`);
          }
        }
      }
    }

    res.json(updatedOrder);
  } catch (err) {
    console.error('Lỗi cập nhật trạng thái:', err);
    res.status(500).json({ error: err.message });
  }
});

// ======================
// XÓA ĐƠN HÀNG
// ======================
router.delete('/:id', async (req, res) => {
  try {
    let result;
    let orderToDelete;

    // Tìm đơn hàng trước khi xóa
    if (req.params.id.startsWith('ORD-')) {
      orderToDelete = await Order.findOne({ id: req.params.id });
      result = await Order.findOneAndDelete({ id: req.params.id });
    }
    else if (req.params.id.match(/^[0-9a-fA-F]{24}$/)) {
      orderToDelete = await Order.findById(req.params.id);
      result = await Order.findByIdAndDelete(req.params.id);
    } else {
      return res.status(400).json({ error: 'ID đơn hàng không hợp lệ' });
    }

    if (!result) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy đơn hàng' });
    }

    //Nếu đơn hàng đã được giao, cần hoàn lại stock khi xóa
    if (orderToDelete && orderToDelete.status === 'Đã giao') {
      console.log(`Đơn hàng ${orderToDelete.id} đã giao, hoàn lại stock...`);

      for (const item of orderToDelete.items) {
        const product = await Product.findById(item.productId);

        if (product) {
          const variant = product.variants.find(
            v => v.size === item.size && v.color === item.color
          );

          if (variant) {
            // Tăng lại stock
            variant.quantity += item.quantity;
            product.stock = product.variants.reduce((sum, v) => sum + v.quantity, 0);

            // Giảm sold
            product.sold = Math.max(0, (product.sold || 0) - item.quantity);

            await product.save();
            console.log(`Hoàn lại ${item.quantity} cho ${product.name}`);
          }
        }
      }
    }

    res.json({ success: true });
  } catch (err) {
    console.error('Lỗi xóa đơn:', err);
    res.status(500).json({ error: err.message });
  }
});

// ======================
// ĐỒNG BỘ SOLD VÀ STOCK
// ======================
router.post('/sync-sold', async (req, res) => {
  try {
    console.log('Bắt đầu đồng bộ sold và stock...');

    // Reset sold và stock về 0
    await Product.updateMany({}, { sold: 0 });
    console.log('Đã reset sold về 0');

    // Lấy tất cả đơn hàng đã giao
    const deliveredOrders = await Order.find({ status: 'Đã giao' });
    console.log(` thấy ${deliveredOrders.length} đơn hàng đã giao`);

    if (deliveredOrders.length === 0) {
      return res.json({
        success: true,
        message: 'Không có đơn hàng nào đã giao',
        totalProductsUpdated: 0
      });
    }

    // Tính toán sold
    const soldMap = new Map();
    deliveredOrders.forEach(order => {
      order.items.forEach(item => {
        const productId = item.productId.toString();
        soldMap.set(productId, (soldMap.get(productId) || 0) + item.quantity);
      });
    });

    // Cập nhật sold (không cập nhật stock vì stock đã được quản lý qua variants)
    for (const [productId, sold] of soldMap.entries()) {
      await Product.findByIdAndUpdate(productId, { sold });
    }

    console.log(`Đồng bộ hoàn tất! Đã cập nhật sold cho ${soldMap.size} sản phẩm`);

    res.json({
      success: true,
      message: 'Đã đồng bộ sold thành công',
      totalProductsUpdated: soldMap.size,
      totalSold: Array.from(soldMap.values()).reduce((a, b) => a + b, 0)
    });
  } catch (err) {
    console.error('Lỗi đồng bộ sold:', err);
    res.status(500).json({ error: err.message });
  }
});

// ======================
// KIỂM TRA SOLD VÀ STOCK
// ======================
router.get('/check-sold', async (req, res) => {
  try {
    const products = await Product.find()
      .select('name code sold stock price variants')
      .sort({ sold: -1 });

    const orders = await Order.find({ status: 'Đã giao' });

    res.json({
      products: products.map(p => ({
        code: p.code,
        name: p.name,
        sold: p.sold,
        stock: p.stock,
        price: p.price,
        variants: p.variants.map(v => ({
          size: v.size,
          color: v.color,
          quantity: v.quantity
        }))
      })),
      totalOrders: orders.length,
      totalProducts: products.length
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
