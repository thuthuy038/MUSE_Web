const express = require('express');
const mongoose = require('mongoose');

require('dotenv').config();
const cors = require('cors')
const path = require('path')

const passport = require('./config/passport');
const addressRoute = require('./src/routes/address.routes')

const app = express();

app.use(cors())
app.use(express.json())

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

//Static serve images
app.use("/uploads", express.static(path.join(__dirname, process.env.UPLOAD_DIR || "uploads")))
app.use("/api/images", require("./src/routes/image.routes"))

app.use('/api/auth', require('./src/routes/auth.routes'));
app.use('/api/users', require('./src/routes/users.routes'));
app.use('/api/address',addressRoute);
app.use("/api/products", require("./src/routes/product.routes"))
app.use("/api/categories", require("./src/routes/category.routes"))
app.use("/api/orders", require("./src/routes/order.routes"))
app.use("/api/blogs", require("./src/routes/blog.routes"))
app.use("/api/promotions", require("./src/routes/promotion.routes"))
app.use("/api/banners", require("./src/routes/banner.routes"))
app.use("/api/reviews", require("./src/routes/review.routes"))
app.use("/api/upload", require("./src/routes/upload.routes"))
app.use("/api/promotions", require("./src/routes/promotion.routes"))
app.use("/api/chats", require("./src/routes/chat.routes"))
app.use("/api/lookbook", require("./src/routes/lookbook.routes"))
app.use("/api/dashboard", require("./src/routes/dashboard.routes"))
app.use("/api/notifications", require("./src/routes/notification.routes"))

app.use(passport.initialize());

app.use('/api/location', require('./src/routes/location.routes'));
app.use('/api/address', require('./src/routes/address.routes'));
app.use('/api/cart', require('./src/routes/cart.routes'));

app.use((err, req, res, next) => {
    const status = err.status || 500
    res.status(status).json({message: err.message || "Server error"})
})

mongoose.connect(process.env.MONGO_URI).then(()=>{
    const port = process.env.PORT || 3000;
    app.listen(port, () => console.log(`API running on port: ${port}`))

}).catch((e) => {
    console.log("Mongo connection error: ", e)
    process.exit(1)
})