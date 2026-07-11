const Review = require("../models/Review");
const Order = require("../models/Order");
const Product = require("../models/Product");

// ======================================================
// HÀM CẬP NHẬT RATING
// ======================================================
const updateProductRating = async (productId) => {
  try {
    const allReviews = await Review.find({ productId });
    
    if (allReviews.length === 0) {
      await Product.findByIdAndUpdate(productId, {
        rating: 0,
        reviewCount: 0
      });
      console.log(`🔄 Reset rating cho product ${productId}`);
      return;
    }
    
    const totalStars = allReviews.reduce((sum, r) => sum + r.rating, 0);
    const averageRating = Math.round((totalStars / allReviews.length) * 10) / 10;
    
    await Product.findByIdAndUpdate(productId, {
      rating: averageRating,
      reviewCount: allReviews.length
    });
    
    console.log(`✅ Product ${productId}: rating = ${averageRating} (${allReviews.length} review)`);
  } catch (error) {
    console.error("Lỗi cập nhật rating:", error);
  }
};

// ======================================================
// EXPORT CONTROLLERS
// ======================================================
exports.createReview = async (req, res) => {
  try {
    const { productId, orderId, rating, content, images, videos, size, color } = req.body;
    const userId = req.user._id;
    
    // Kiểm tra order
    const order = await Order.findById(orderId);
    if (!order) return res.status(404).json({ message: "Order không tồn tại" });
    if (order.userId.toString() !== userId.toString()) {
      return res.status(403).json({ message: "Không có quyền" });
    }
    
    // Kiểm tra sản phẩm trong order
    const hasProduct = order.items.some(item => item.productId.toString() === productId.toString());
    if (!hasProduct) {
      return res.status(400).json({ message: "Sản phẩm không nằm trong đơn hàng" });
    }
    
    // Kiểm tra đã review chưa
    const existed = await Review.findOne({ userId, productId, orderId });
    if (existed) {
      return res.status(400).json({ message: "Đã review sản phẩm này rồi" });
    }
    
    // Tạo review
    const review = new Review({
      userId, productId, orderId,
      rating: Number(rating),
      content, images, videos, size, color
    });
    
    await review.save();
    
    // ✅ Cập nhật rating
    await updateProductRating(productId);
    
    res.status(201).json({ message: "Tạo review thành công", data: review });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
};

exports.updateReview = async (req, res) => {
  try {
    const { id } = req.params;
    const { rating, content, images, videos, size, color } = req.body;
    const userId = req.user._id;
    
    const review = await Review.findById(id);
    if (!review) return res.status(404).json({ message: "Không tìm thấy review" });
    if (review.userId.toString() !== userId.toString()) {
      return res.status(403).json({ message: "Không có quyền" });
    }
    
    const productId = review.productId;
    
    review.rating = Number(rating) || review.rating;
    review.content = content || review.content;
    review.images = images || review.images;
    review.videos = videos || review.videos;
    review.size = size || review.size;
    review.color = color || review.color;
    review.isEdited = true;
    review.status = "pending";
    
    await review.save();
    
    // ✅ Cập nhật rating
    await updateProductRating(productId);
    
    res.json({ message: "Cập nhật thành công", data: review });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.deleteReview = async (req, res) => {
  try {
    const { id } = req.params;
    const review = await Review.findById(id);
    if (!review) return res.status(404).json({ message: "Không tìm thấy review" });
    
    const productId = review.productId;
    await Review.findByIdAndDelete(id);
    
    // ✅ Cập nhật rating
    await updateProductRating(productId);
    
    res.json({ message: "Đã xóa review và cập nhật lại điểm sản phẩm" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.replyReview = async (req, res) => {
  try {
    const { id } = req.params;
    const { adminReply } = req.body;
    
    const updated = await Review.findByIdAndUpdate(
      id,
      { adminReply, status: "replied" },
      { new: true }
    );
    
    res.json({ message: "Phản hồi thành công", data: updated });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.getReviewsByProduct = async (req, res) => {
  try {
    const reviews = await Review.find({
      productId: req.params.productId,
      status: { $in: ["approved", "replied"] }
    })
      .populate("userId", "name")
      .sort({ createdAt: -1 })
      .lean();
    
    const formatted = reviews.map(r => ({
      _id: r._id,
      customerName: r.userId?.name || "Khách hàng",
      rating: r.rating,
      content: r.content,
      createdAt: r.createdAt,
      images: r.images?.map(img => img.url) || [],
      videos: r.videos?.map(vid => vid.url) || [],
      size: r.size,
      color: r.color,
      adminReply: r.adminReply
    }));
    
    res.json({ data: formatted, total: formatted.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.syncRatings = async (req, res) => {
  try {
    console.log("🔄 Bắt đầu đồng bộ rating...");
    
    const products = await Product.find();
    let updatedCount = 0;
    
    for (const product of products) {
      const allReviews = await Review.find({ productId: product._id });
      
      if (allReviews.length === 0) {
        if (product.rating !== 0 || product.reviewCount !== 0) {
          product.rating = 0;
          product.reviewCount = 0;
          await product.save();
          updatedCount++;
        }
      } else {
        const totalStars = allReviews.reduce((sum, r) => sum + r.rating, 0);
        const averageRating = Math.round((totalStars / allReviews.length) * 10) / 10;
        
        if (product.rating !== averageRating || product.reviewCount !== allReviews.length) {
          product.rating = averageRating;
          product.reviewCount = allReviews.length;
          await product.save();
          updatedCount++;
        }
      }
    }
    
    console.log(`🎉 Đồng bộ hoàn tất! Đã cập nhật ${updatedCount} sản phẩm`);
    res.json({ success: true, updatedProducts: updatedCount });
  } catch (err) {
    console.error("Lỗi đồng bộ rating:", err);
    res.status(500).json({ error: err.message });
  }
};