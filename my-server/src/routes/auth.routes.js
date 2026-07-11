const express = require('express');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { protect } = require('../../middleware/auth');
const router = express.Router();
const passport = require('passport');
const upload = require('../uploads');
const { getBucket } = require('../services/gridfs');
const { Readable } = require('stream');
const axios = require('axios');

const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '30d' });
};

// Đăng ký
router.post('/register', async (req, res) => {
  console.log('Register request body:', req.body);
  const { name, emailOrPhone, password, role } = req.body;
  try {
    if (!name || !emailOrPhone || !password) {
      return res.status(400).json({ message: 'Vui lòng điền đầy đủ thông tin' });
    }

    const isEmail = /^[^\s@]+@([^\s@]+\.)+[^\s@]+$/.test(emailOrPhone);
    let userExists;

    if (isEmail) {
      userExists = await User.findOne({ email: emailOrPhone });
    } else {
      userExists = await User.findOne({ phone: emailOrPhone });
    }

    if (userExists) {
      return res.status(400).json({ message: isEmail ? 'Email đã tồn tại' : 'Số điện thoại đã tồn tại' });
    }

    const userData = {
      name,
      password,
      role: role || 'customer'
    };

    if (isEmail) {
      userData.email = emailOrPhone;
    } else {
      userData.phone = emailOrPhone;
    }

    const user = await User.create(userData);

    res.status(201).json({
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      token: generateToken(user._id),
    });
  } catch (error) {
    console.error('Lỗi đăng ký:', error);
    res.status(500).json({ message: 'Lỗi server', error: error.message });
  }
});

// Đăng nhập (hỗ trợ email hoặc số điện thoại)
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    let user;
    const isEmail = /^[^\s@]+@([^\s@]+\.)+[^\s@]+$/.test(email);
    if (isEmail) {
      user = await User.findOne({ email });
    } else {
      user = await User.findOne({ phone: email });
    }

    if (user && (await user.matchPassword(password))) {
      if (user.status === 'inactive') {
        return res.status(403).json({ message: 'Tài khoản đã bị khóa, vui lòng liên hệ admin' });
      }
      res.json({
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        token: generateToken(user._id),
      });
    } else {
      res.status(401).json({ message: 'Email/số điện thoại hoặc mật khẩu không đúng' });
    }
  } catch (error) {
    console.error('Lỗi đăng nhập:', error);
    res.status(500).json({ message: 'Lỗi server' });
  }
});

// Lấy profile (yêu cầu đăng nhập)
router.get('/profile', protect, async (req, res) => {
  res.json(req.user);
});

// Cập nhật profile
router.put('/profile', protect, upload.single('avatar'), async (req, res) => {
  try {
    const updateData = { ...req.body };
    delete updateData.password;

    if (req.file) {
      const bucket = getBucket();
      const readStream = Readable.from(req.file.buffer);
      const uploadStream = bucket.openUploadStream(req.file.originalname, {
        contentType: req.file.mimetype,
      });

      await new Promise((resolve, reject) => {
        readStream.pipe(uploadStream).on('error', reject).on('finish', resolve);
      });

      const fileId = uploadStream.id;
      updateData.avatar = {
        gridfsFileId: fileId,
        filename: uploadStream.filename,
        originalname: req.file.originalname,
        mimetype: req.file.mimetype,
        size: req.file.size,
        url: `/api/images/${fileId.toString()}`,
      };

      const oldUser = await User.findById(req.user._id || req.user.id);
      if (oldUser && oldUser.avatar && oldUser.avatar.gridfsFileId) {
        try {
          await bucket.delete(oldUser.avatar.gridfsFileId);
        } catch (err) {
          console.error('Lỗi khi xóa avatar cũ:', err);
        }
      }
    } else if (updateData.avatar === 'null') {
      updateData.avatar = null;
    }

    if (updateData.email) {
      const emailExists = await User.findOne({
        email: updateData.email,
        _id: { $ne: req.user._id || req.user.id }
      });
      if (emailExists) {
        return res.status(400).json({ message: 'Email này đã được người khác sử dụng' });
      }
    }

    const updatedUser = await User.findByIdAndUpdate(
      req.user._id || req.user.id,
      { $set: updateData },
      { new: true, runValidators: true }
    ).select('-password');

    if (!updatedUser) return res.status(404).json({ message: 'Không tìm thấy người dùng' });

    res.json(updatedUser);
  } catch (error) {
    console.error('Lỗi cập nhật profile:', error);
    res.status(500).json({ message: 'Lỗi server', error: error.message });
  }
});

// Google Auth - đăng nhập
router.get('/google',
  passport.authenticate('google', { scope: ['profile', 'email'] })
);

// Google Auth - callback (có kiểm tra trạng thái tài khoản)
router.get(
  '/google/callback',
  passport.authenticate('google', { failureRedirect: '/login?oauth=failed', session: false }),
  async (req, res) => {
    try {
      // Lấy user từ database để kiểm tra status (req.user từ passport chỉ có thông tin cơ bản)
      const user = await User.findById(req.user._id);
      if (!user) {
        return res.redirect('http://localhost:4200/login?oauth=failed');
      }
      if (user.status === 'inactive') {
        // Tài khoản bị khóa
        return res.redirect('http://localhost:4200/login?oauth=blocked');
      }
      const token = jwt.sign(
        { id: user._id },
        process.env.JWT_SECRET,
        { expiresIn: '7d' }
      );
      res.redirect(`http://localhost:4200/oauth-redirect?token=${token}`);
    } catch (error) {
      console.error('Lỗi Google callback:', error);
      res.redirect('http://localhost:4200/login?oauth=failed');
    }
  }
);

// Gửi OTP (tạm thời dùng OTP mặc định 1234)
router.post('/send-otp', async (req, res) => {
  const { emailOrPhone } = req.body;
  try {
    // Tìm user theo email hoặc số điện thoại
    const isEmail = /^[^\s@]+@([^\s@]+\.)+[^\s@]+$/.test(emailOrPhone);
    let user;
    if (isEmail) {
      user = await User.findOne({ email: emailOrPhone });
    } else {
      user = await User.findOne({ phone: emailOrPhone });
    }
    if (!user) {
      return res.status(404).json({ message: 'Không tìm thấy tài khoản' });
    }
    // Gửi OTP (mặc định 1234) - trong thực tế sẽ gửi email/SMS, ở đây chỉ trả về thành công
    res.json({ message: 'OTP đã được gửi', otp: '1234' }); // Tạm thời trả về OTP để test
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Lỗi server' });
  }
});

// Xác thực OTP và đặt lại mật khẩu
router.post('/reset-password', async (req, res) => {
  const { emailOrPhone, otp, newPassword } = req.body;
  try {
    if (otp !== '1234') {
      return res.status(400).json({ message: 'Mã OTP không đúng' });
    }
    const isEmail = /^[^\s@]+@([^\s@]+\.)+[^\s@]+$/.test(emailOrPhone);
    let user;
    if (isEmail) {
      user = await User.findOne({ email: emailOrPhone });
    } else {
      user = await User.findOne({ phone: emailOrPhone });
    }
    if (!user) {
      return res.status(404).json({ message: 'Không tìm thấy tài khoản' });
    }
    // Cập nhật mật khẩu mới
    user.password = newPassword; // Sẽ được mã hóa bởi pre-save hook
    await user.save();
    res.json({ message: 'Đặt lại mật khẩu thành công' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Lỗi server' });
  }
});

router.get('/proxy-image', async (req, res) => {
  const imageUrl = req.query.url;
  if (!imageUrl) return res.status(400).send('Missing url');

  try {
    const response = await axios({
      method: 'GET',
      url: imageUrl,
      responseType: 'stream'
    });
    res.setHeader('Access-Control-Allow-Origin', '*');
    response.data.pipe(res);
  } catch (err) {
    res.status(500).send('Error fetching image');
  }
});

module.exports = router;