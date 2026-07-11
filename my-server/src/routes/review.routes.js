const express = require("express");
const router = express.Router();
const Review = require("../models/Review");
const Product = require("../models/Product"); // Bắt buộc phải có cái này để cập nhật số sao
const Order = require("../models/Order");
const { createNotification } = require('./notification.routes');

// ======================================================
// HÀM PHỤ: TỰ ĐỘNG CẬP NHẬT RATING CHO SẢN PHẨM
// Mỗi khi tạo/sửa/xóa review, hàm này sẽ tự động chạy
// ======================================================
const updateProductRating = async (productId) => {
  try {
    const allReviews = await Review.find({ productId });

    if (allReviews.length === 0) {
      // Nếu không còn review nào, reset về 0
      await Product.findByIdAndUpdate(productId, {
        rating: 0,
        reviewCount: 0
      });
      return;
    }

    const reviewCount = allReviews.length;
    const totalStars = allReviews.reduce((sum, item) => sum + item.rating, 0);

    // Tính trung bình và làm tròn 1 chữ số thập phân (vd: 4.66 -> 4.7)
    const averageRating = Math.round((totalStars / reviewCount) * 10) / 10;

    await Product.findByIdAndUpdate(productId, {
      rating: averageRating,
      reviewCount: reviewCount
    });

    console.log(`[Hệ thống] Đã cập nhật Rating cho sản phẩm ${productId}: ${averageRating} sao (${reviewCount} lượt)`);
  } catch (error) {
    console.error("Lỗi khi cập nhật Product Rating:", error);
  }
};

// ==========================================
// GET ALL REVIEWS - Danh sách admin
// ==========================================
router.get("/", async (req, res) => {
  try {
    const reviews = await Review.find()
      .populate("userId", "name")
      .populate("productId", "name images")
      .populate("orderId", "id customerName items")
      .sort({ createdAt: -1 })
      .lean();

    const flatComments = reviews.map((r) => {
      const rawName = r.orderId?.customerName || r.userId?.name || "Khách lẻ";
      const finalName = r.userId ? rawName : `${rawName} (Khách vãng lai)`;
      const orderItem = r.orderId?.items?.find(item =>
        item.productId?.toString() === r.productId?._id?.toString()
      );

      return {
        _id: r._id,
        feedbackId: r.feedbackId,
        customerName: finalName,
        orderId: r.orderId?.id || "",
        rating: r.rating || 0,
        content: r.content || "",
        createdAt: r.createdAt,
        images: r.images?.map(img => img.url) || [],
        videos: r.videos?.map(vid => vid.url) || [],
        productName: r.productId?.name || "",
        productImage: r.productId?.images?.[0]?.url
          ? `http://localhost:3000${r.productId.images[0].url}`
          : "",
        size: r.size || orderItem?.size || "Mặc định",
        color: r.color || orderItem?.color || "Mặc định",
        status: r.status || "pending",
        adminReply: r.adminReply || "",
        // THÊM: Trả về thời gian admin phản hồi
        adminReplyAt: r.adminReplyAt || ""
      };
    });


    res.json({ data: flatComments, total: flatComments.length });
  } catch (err) {
    console.error("GET REVIEWS ERROR:", err);
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// CHECK REVIEW (cho order tracking)
// ==========================================
router.get("/check", async (req, res) => {
  try {
    const { userId, productId, orderId } = req.query;
    const review = await Review.findOne({ userId, productId, orderId });
    res.json({
      exists: !!review,
      reviewId: review?._id || null
    });
  } catch (err) {
    console.error("CHECK REVIEW ERROR:", err);
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// GET REVIEW DETAIL
// ==========================================
router.get("/:id", async (req, res) => {
  try {
    const review = await Review.findById(req.params.id)
      .populate("userId", "name")
      .populate("productId", "_id name images")
      .populate("orderId", "id items customerName")
      .lean();

    if (!review) {
      return res.status(404).json({ message: "Review not found" });
    }

    const rawName = review.orderId?.customerName || review.userId?.name || "Khách lẻ";
    const finalName = review.userId ? rawName : `${rawName} (Khách vãng lai)`;
    const orderItem = review.orderId?.items?.find(item =>
      item.productId?.toString() === review.productId?._id?.toString()
    );

    res.json({
      _id: review._id,
      feedbackId: review.feedbackId,
      customerName: finalName,
      orderId: review.orderId?.id || "",
      orderDbId: review.orderId?._id || "",
      rating: review.rating || 0,
      content: review.content || "",
      createdAt: review.createdAt,
      images: review.images || [],
      videos: review.videos || [],
      productName: review.productId?.name || "",
      productImage: review.productId?.images?.[0]?.url
        ? `http://localhost:3000${review.productId.images[0].url}`
        : "",
      size: review.size || orderItem?.size || "Mặc định",
      color: review.color || orderItem?.color || "Mặc định",
      status: review.status || "pending",
      adminReply: review.adminReply || "",
      adminReplyAt: review.adminReplyAt || ""
    });
  } catch (err) {
    console.error("GET REVIEW DETAIL ERROR:", err);
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// CREATE REVIEW (Khách gửi đánh giá mới)
// ==========================================
router.post("/", async (req, res) => {
  try {
    const { userId, productId, orderId, rating, content, images, videos, size, color } = req.body;

    if (!userId || !productId || !orderId) {
      return res.status(400).json({ error: "Thiếu userId hoặc productId hoặc orderId" });
    }

    const existing = await Review.findOne({ userId, productId, orderId });
    if (existing) {
      return res.status(400).json({ error: "Bạn đã đánh giá đơn hàng này rồi" });
    }

    const newReview = new Review({
      userId, productId, orderId, rating: Number(rating), content, images, videos, size, color
    });

    await newReview.save();

    // ✅ TẠO THÔNG BÁO CHO ADMIN - SỬA LẠI ĐÚNG BIẾN newReview
    await createNotification(
      'Đánh giá mới',
      `Khách hàng vừa đánh giá ${newReview.rating} sao cho sản phẩm`,
      'review',
      newReview._id
    );


    // ✅ TÍNH LẠI SAO CHO SẢN PHẨM NGAY LẬP TỨC
    await updateProductRating(productId);

    res.status(201).json({ message: "Review created", data: newReview });
  } catch (err) {
    console.error("CREATE REVIEW ERROR:", err);
    if (err.code === 11000) return res.status(400).json({ error: "Review đã tồn tại" });
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// UPDATE REVIEW (Khách sửa đánh giá)
// ==========================================
router.put("/:id", async (req, res) => {
  try {
    const { rating, content, images, videos, size, color } = req.body;

    const updatedReview = await Review.findByIdAndUpdate(
      req.params.id,
      {
        $set: { rating: Number(rating), content, images, videos, size, color, isEdited: true, status: "pending" }
      },
      { new: true }
    );

    if (!updatedReview) return res.status(404).json({ error: "Không tìm thấy đánh giá" });

    // ✅ TÍNH LẠI SAO CHO SẢN PHẨM SAU KHI SỬA
    await updateProductRating(updatedReview.productId);

    res.json({ message: "Review updated", data: updatedReview });
  } catch (err) {
    console.error("UPDATE REVIEW ERROR:", err);
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// DELETE REVIEW (Khách xóa đánh giá)
// ==========================================
router.delete("/:id", async (req, res) => {
  try {
    const review = await Review.findById(req.params.id);
    if (!review) return res.status(404).json({ error: "Không tìm thấy đánh giá" });

    const productId = review.productId; // Lưu lại ID sản phẩm trước khi xóa
    await Review.findByIdAndDelete(req.params.id);

    // ✅ TÍNH LẠI SAO CHO SẢN PHẨM SAU KHI XÓA
    await updateProductRating(productId);

    res.json({ message: "Review deleted" });
  } catch (err) {
    console.error("DELETE REVIEW ERROR:", err);
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// ADMIN REPLY (Shop phản hồi)
// ==========================================
router.put("/:id/reply", async (req, res) => {
  try {
    const { adminReply } = req.body;
    const updated = await Review.findByIdAndUpdate(
      req.params.id,
      {
        adminReply,
        status: "replied",
        adminReplyAt: new Date() // ✅ LƯU GIỜ SHOP PHẢN HỒI
      },
      { new: true }
    );
    res.json({ message: "Reply saved", data: updated });
  } catch (err) {
    console.error("ADMIN REPLY ERROR:", err);
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// GET REVIEWS BY PRODUCT (Client hiển thị)
// ==========================================
router.get("/product/:productId", async (req, res) => {
  try {
    const reviews = await Review.find({
      productId: req.params.productId,
      // ✅ SỬA LẠI: Lấy cả những đánh giá mới gửi (pending) để nó hiện lên ngay
      status: { $in: ["pending", "approved", "replied"] }
    })
      .populate("userId", "name")
      .sort({ createdAt: -1 }) // Mới nhất hiện lên đầu
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
      adminReply: r.adminReply,
      // ✅ TRẢ VỀ GIỜ ADMIN PHẢN HỒI
      adminReplyAt: r.adminReplyAt || r.updatedAt
    }));

    res.json({ data: formatted, total: formatted.length });
  } catch (err) {
    console.error("GET PRODUCT REVIEWS ERROR:", err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;