const express = require('express');
const User = require('../models/User');
const { protect, admin } = require('../../middleware/auth');
const router = express.Router();
const mongoose = require("mongoose")
const upload = require("../uploads")
const { getBucket } = require("../services/gridfs")
const { Readable } = require("stream")

// Lấy tất cả users (chỉ admin)
router.get('/', protect, admin, async (req, res) => {
  try {
    const users = await User.find({}).select('-password');
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: 'Lỗi server' });
  }
});

// Tìm user theo code (CUS-xxx)
router.get('/code/:code', async (req, res) => {
  console.log('Route /code/:code được gọi với code:', req.params.code);
  try {
    const user = await User.findOne({ code: req.params.code }).select('-password');
    if (!user) {
      return res.status(404).json({ message: 'Không tìm thấy user' });
    }
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: 'Lỗi server' });
  }
});


// Xóa user (admin)
router.delete('/:id', protect, admin, async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'Không tìm thấy người dùng' });
    await user.deleteOne();
    res.json({ message: 'Xóa người dùng thành công' });
  } catch (error) {
    res.status(500).json({ message: 'Lỗi server' });
  }
});

// Lấy danh sách khách hàng (role = customer)
router.get('/customers', async (req, res) => {
  try {

    const customers = await User.find({ role: 'customer' }).select('-password');

    res.json(customers);

  } catch (error) {
    res.status(500).json({ message: 'Lỗi server' });
  }
});

// Lấy wishlist của user hiện tại
router.get('/wishlist', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).populate('wishlist');
    res.json(user.wishlist || []);
  } catch (error) {
    res.status(500).json({ message: 'Lỗi server' });
  }
});

// Thêm sản phẩm vào wishlist
router.post('/wishlist/:productId', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    const productId = req.params.productId;

    if (!user.wishlist.includes(productId)) {
      user.wishlist.push(productId);
      await user.save();
    }
    res.json({ message: 'Đã thêm vào wishlist' });
  } catch (error) {
    res.status(500).json({ message: 'Lỗi server' });
  }
});

// Xóa sản phẩm khỏi wishlist
router.delete('/wishlist/:productId', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    user.wishlist = user.wishlist.filter(id => id.toString() !== req.params.productId);
    await user.save();
    res.json({ message: 'Đã xóa khỏi wishlist' });
  } catch (error) {
    res.status(500).json({ message: 'Lỗi server' });
  }
});

// Lấy user theo id
router.get('/:id', async (req, res) => {
  try {

    const user = await User.findById(req.params.id).select('-password');

    if (!user) {
      return res.status(404).json({ message: 'Không tìm thấy user' });
    }

    res.json(user);

  } catch (error) {
    res.status(500).json({ message: 'Lỗi server' });
  }
});

router.post('/', async (req, res) => {

  try {

    const user = new User(req.body)

    const createdUser = await user.save()

    res.status(201).json(createdUser)

  }
  catch (error) {

    res.status(500).json({ message: 'Lỗi tạo user' })

  }

})

router.put('/:id', async (req, res) => {
  try {
    console.log('PUT /:id received body:', JSON.stringify(req.body, null, 2));

    // Chỉ cho phép cập nhật các trường này
    const allowedFields = ['name', 'email', 'phone', 'gender', 'birthday', 'status', 'role', 'addresses'];
    const updateData = {};
    allowedFields.forEach(field => {
      if (req.body[field] !== undefined) {
        updateData[field] = req.body[field];
      }
    });

    const updatedUser = await User.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    ).select('-password');

    if (!updatedUser) {
      return res.status(404).json({ message: 'Không tìm thấy user' });
    }
    res.json(updatedUser);
  } catch (error) {
    console.error('Lỗi cập nhật user:', error);
    res.status(500).json({ message: 'Lỗi cập nhật user', error: error.message });
  }
});

// API upload avatar
router.post("/:id/avatar", upload.single("avatar"), async (req, res, next) => {
  try {

    const user = await User.findById(req.params.id)
    if (!user) return res.status(404).json({ message: "User not found" })

    const bucket = getBucket()

    const file = req.file

    if (!file) return res.status(400).json({ message: "No file uploaded" })

    const readStream = Readable.from(file.buffer)

    const uploadStream = bucket.openUploadStream(file.originalname, {
      contentType: file.mimetype,
      metadata: { originalname: file.originalname }
    })

    await new Promise((resolve, reject) => {
      readStream
        .pipe(uploadStream)
        .on("error", reject)
        .on("finish", resolve)
    })

    const fileId = uploadStream.id

    const avatarRecord = {
      gridfsFileId: fileId,
      filename: uploadStream.filename,
      originalname: file.originalname,
      mimetype: file.mimetype,
      size: file.size,
      url: `/api/images/${fileId.toString()}`
    }

    // nếu đã có avatar thì xóa avatar cũ
    if (user.avatar && user.avatar.gridfsFileId) {
      try {
        await bucket.delete(user.avatar.gridfsFileId)
      } catch (err) { }
    }

    user.avatar = avatarRecord

    await user.save()

    res.json(user)

  } catch (e) {
    next(e)
  }
})

// Xóa avatar
router.delete("/:id/avatar", async (req, res, next) => {
  try {

    const user = await User.findById(req.params.id)

    if (!user) return res.status(404).json({ message: "User not found" })

    if (!user.avatar) return res.json(user)

    const bucket = getBucket()

    const fileId = mongoose.Types.ObjectId.createFromHexString(
      String(user.avatar.gridfsFileId)
    )

    await bucket.delete(fileId)

    user.avatar = null

    await user.save()

    res.json(user)

  } catch (e) {
    next(e)
  }
})


module.exports = router;