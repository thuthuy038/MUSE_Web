const jwt = require("jsonwebtoken");
const User = require("../src/models/User");

exports.protect = async (req, res, next) => {
  let token;

  // Kiểm tra xem có Token trong Header không
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      token = req.headers.authorization.split(' ')[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      
      // Lấy user từ token, loại bỏ password
      req.user = await User.findById(decoded.id).select('-password');
      
      if (!req.user) {
        // Nếu có token mà không tìm thấy user thì có thể acc đã bị xóa
        return res.status(401).json({ message: "Người dùng không tồn tại" });
      }
      
      return next(); // Đã xác thực thành công, đi tiếp
    } catch (error) {
      console.error("Token lỗi:", error);
      // Nếu token sai/hết hạn, ta coi như khách vãng lai thay vì chặn đứng (để chat vẫn chạy)
      req.user = null;
      return next();
    }
  }

  // 🔥 THAY ĐỔI QUAN TRỌNG: 
  // Nếu không có token, không trả về 401 nữa mà gán user = null 
  // để logic Chat biết đây là khách vãng lai và cho họ nhắn tin.
  if (!token) {
    req.user = null;
    next();
  }
};

exports.admin = (req, res, next) => {
  if (req.user && req.user.role === 'admin') {
    next();
  } else {
    res.status(403).json({ message: "Yêu cầu quyền Admin" });
  }
};