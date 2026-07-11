const mongoose = require('mongoose');
const ImageSchema = require("./Images")
const bcrypt = require('bcryptjs');
const Counter = require("./Counter");

const addressSchema = new mongoose.Schema({
  fullName: String,
  phone: String,
  province: String,
  district: String,
  ward: String,
  street: String,
  type: {
    type: String,
    enum: ["nha_rieng", "van_phong"],
    default: "nha_rieng"
  },
  isDefault: {
    type: Boolean,
    default: false
  }
});

const userSchema = new mongoose.Schema(
  {
    code: { type: String, unique: true },
    avatar: { type: ImageSchema, default: null },
    name: { type: String, required: true },
    email: { type: String, sparse: true, unique: true },
    password: { type: String, required: true },
    phone: { type: String, unique: true, sparse: true },
    role: { type: String, enum: ['customer', 'admin'], default: 'customer' },
    addresses: [addressSchema],
    wishlist: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Product"
      }
    ],
    shippingAddresses: {
      type: [String],
      default: []
    },

    gender: {
      type: String,
      enum: ['male', 'female', 'other'],
      default: 'other'
    },

    birthday: { type: Date },

    status: {
      type: String,
      enum: ['active', 'inactive'],
      default: 'active'
    },

    createdAt: {
      type: Date,
      default: Date.now
    },

    googleId: {
      type: String,
      default: null
    }
  },
  { timestamps: true }
);

// Mã hóa mật khẩu và sinh mã khách hàng trước khi lưu
userSchema.pre("save", async function (next) {
  try {
    // Mã hóa password nếu có thay đổi
    if (this.isModified('password')) {
      const salt = await bcrypt.genSalt(10);
      this.password = await bcrypt.hash(this.password, salt);
    }
 
    // Tự động tạo mã (CUS-xxx hoặc AD-xxx) nếu chưa có
    if (!this.code) {
      const prefix = this.role === 'admin' ? 'AD' : 'CUS';
      const counter = await Counter.findByIdAndUpdate(
        { _id: this.role }, // dùng role làm id để phân biệt counter
        { $inc: { seq: 1 } },
        { new: true, upsert: true }
      );
      const seq = counter.seq.toString().padStart(3, '0');
      this.code = `${prefix}-${seq}`;
    }
  } catch (error) {
    next(error);
  }
});

// So sánh mật khẩu
userSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model('User', userSchema);