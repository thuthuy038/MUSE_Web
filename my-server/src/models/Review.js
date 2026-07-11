const mongoose = require("mongoose");

const reviewSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },

    feedbackId: {
      type: String,
      unique: true
    },

    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true
    },

    orderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order",
      required: true
    },

    size: { type: String, default: "" },
    color: { type: String, default: "" },

    rating: {
      type: Number,
      required: true,
      min: 1,
      max: 5
    },

    content: { type: String, default: "" },

    images: [
      {
        url: String,
        fileId: String
      }
    ],

    // thêm video
    videos: [{
      url: String,
      fileId: String
    }],

    status: {
      type: String,
      enum: ["pending", "approved", "rejected", "replied"],
      default: "pending"
    },

    adminReply: { type: String, default: "" },

    // ✅ ĐÃ THÊM: Thời gian shop phản hồi
    adminReplyAt: { type: Date },

    isEdited: { type: Boolean, default: false }

  },
  { timestamps: true }
);

// chống duplicate review
reviewSchema.index(
  { userId: 1, productId: 1, orderId: 1 },
  { unique: true }
);

// auto tạo feedbackId kiểu REV-{year}-0001
reviewSchema.pre("save", async function () {
  if (!this.feedbackId) {
    const year = new Date().getFullYear();

    // Tìm review cuối cùng của năm hiện tại, sắp xếp theo ID giảm dần cho chắc cú
    const lastReview = await mongoose
      .model("Review")
      .findOne({ feedbackId: new RegExp(`^REV-${year}-`) })
      .sort({ feedbackId: -1 })
      .lean();

    let nextId = 1;

    if (lastReview && lastReview.feedbackId) {
      // Cắt chuỗi REV-2026-0005 lấy phần số cuối cùng
      const lastIdNumber = parseInt(lastReview.feedbackId.split('-')[2]);
      if (!isNaN(lastIdNumber)) {
        nextId = lastIdNumber + 1;
      }
    }

    // Ghép lại thành chuỗi, padStart(4, "0") để luôn có 4 chữ số
    this.feedbackId = `REV-${year}-${String(nextId).padStart(4, "0")}`;
  }
});

module.exports = mongoose.model("Review", reviewSchema);