const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');
const fs = require('fs');

// Import routes
const authRoutes = require('./routes/auth');
const productRoutes = require('./routes/products');
const userRoutes = require('./routes/users');
const requestRoutes = require('./routes/requests');
const adminRoutes = require('./routes/admin');
const warehouseRoutes = require('./routes/warehouse');
const orderRoutes = require('./routes/orders');
const deliveryRoutes = require('./routes/delivery');
const paymentRoutes = require('./routes/payments');
const analyticsRoutes = require('./routes/analytics');
const searchRoutes = require('./routes/search');
const recommendationRoutes = require('./routes/recommendations');
const stripeRoutes = require('./routes/payments_stripe');
const razorpayRoutes = require('./routes/payments_razorpay');
const paypalRoutes = require('./routes/payments_paypal');
const adminBootstrapRoute = require('./routes/admin_bootstrap');

dotenv.config();

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: ["http://localhost:3000", "http://localhost:3001"],
    methods: ["GET", "POST"]
  }
});

// Stripe webhook must use raw body
app.use('/api/payments/stripe/webhook', express.raw({ type: 'application/json' }));

// Middleware
app.use(cors());
app.use(express.json());

// Static images
const uploadsDir = path.join(__dirname, 'uploads');
// Ensure uploads subdirectories exist
[uploadsDir, path.join(uploadsDir, 'products'), path.join(uploadsDir, 'profiles')]
  .forEach(dir => { if (!fs.existsSync(dir)) { fs.mkdirSync(dir, { recursive: true }); } });

app.use('/images', express.static(uploadsDir));
app.use('/images/products', express.static(path.join(uploadsDir, 'products')));
app.use('/images/profiles', express.static(path.join(uploadsDir, 'profiles')));

// MongoDB connection
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/farmconnect', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log('MongoDB connected'))
.catch(err => console.log('MongoDB connection error:', err));

// Socket.io connection
io.on('connection', (socket) => {
  console.log('User connected:', socket.id);
  
  socket.on('join-room', (userId) => {
    socket.join(userId);
    console.log(`User ${userId} joined room`);
  });
  
  socket.on('leave-room', (userId) => {
    socket.leave(userId);
    console.log(`User ${userId} left room`);
  });
  
  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});

// Make io accessible to routes
app.use((req, res, next) => {
  req.io = io;
  next();
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/users', userRoutes);
app.use('/api/requests', requestRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/warehouse', warehouseRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/delivery', deliveryRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/search', searchRoutes);
app.use('/api/recommendations', recommendationRoutes);
app.use('/api/payments/stripe', stripeRoutes);
app.use('/api/payments/razorpay', razorpayRoutes);
app.use('/api/payments/paypal', paypalRoutes);
app.use('/api/admin/bootstrap', adminBootstrapRoute);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ message: 'FarmConnect API is running!' });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
