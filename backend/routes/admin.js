const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const admin = require('../middleware/admin');
const User = require('../models/User');
const Product = require('../models/Product');
const Request = require('../models/Request');
const Transport = require('../models/Transport');
const { body, validationResult } = require('express-validator');

// Apply auth then admin check to all routes
router.use(auth);
router.use(admin);

// ==================== DASHBOARD STATISTICS ====================
router.get('/stats', async (req, res) => {
  try {
    const totalUsers = await User.countDocuments();
    const totalFarmers = await User.countDocuments({ role: 'farmer' });
    const totalConsumers = await User.countDocuments({ role: 'customer' });
    const totalProducts = await Product.countDocuments();
    const totalOrders = await Request.countDocuments();
    const pendingOrders = await Request.countDocuments({ status: 'pending' });
    const completedOrders = await Request.countDocuments({ status: 'completed' });
    const totalTransport = await Transport.countDocuments();

    // Monthly stats for the last 6 months
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const monthlyOrders = await Request.aggregate([
      {
        $match: {
          createdAt: { $gte: sixMonthsAgo }
        }
      },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' }
          },
          count: { $sum: 1 },
          totalAmount: { $sum: '$totalAmount' }
        }
      },
      {
        $sort: { '_id.year': 1, '_id.month': 1 }
      }
    ]);

    res.json({
      totalUsers,
      totalFarmers,
      totalConsumers,
      totalProducts,
      totalOrders,
      pendingOrders,
      completedOrders,
      totalTransport,
      monthlyOrders
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// ==================== USER MANAGEMENT ====================
// Get all users with pagination and filters
router.get('/users', async (req, res) => {
  try {
    const { page = 1, limit = 10, role, search, isVerified } = req.query;
    const skip = (page - 1) * limit;

    let query = {};
    
    if (role) query.role = role;
    if (isVerified !== undefined) query.isVerified = isVerified === 'true';
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }

    const users = await User.find(query)
      .select('-password')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await User.countDocuments(query);

    res.json({
      users,
      totalPages: Math.ceil(total / limit),
      currentPage: parseInt(page),
      total
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get single user
router.get('/users/:id', async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Update user
router.put('/users/:id', [
  body('name').optional().trim().isLength({ min: 2 }),
  body('email').optional().isEmail(),
  body('phone').optional().isMobilePhone(),
  body('isVerified').optional().isBoolean()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const user = await User.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    ).select('-password');

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json(user);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Delete user
router.delete('/users/:id', async (req, res) => {
  try {
    const user = await User.findByIdAndDelete(req.params.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// ==================== TRANSPORT MANAGEMENT ====================
// Get all transport partners
router.get('/transport', async (req, res) => {
  try {
    const { page = 1, limit = 10, type, search, isActive } = req.query;
    const skip = (page - 1) * limit;

    let query = {};
    
    if (type) query.type = type;
    if (isActive !== undefined) query.isActive = isActive === 'true';
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { contactPerson: { $regex: search, $options: 'i' } }
      ];
    }

    const transport = await Transport.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Transport.countDocuments(query);

    res.json({
      transport,
      totalPages: Math.ceil(total / limit),
      currentPage: parseInt(page),
      total
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Add new transport partner
router.post('/transport', [
  body('name').trim().isLength({ min: 2 }),
  body('type').isIn(['local', 'regional', 'national']),
  body('contactPerson').trim().isLength({ min: 2 }),
  body('phone').isMobilePhone(),
  body('email').isEmail(),
  body('pricing.basePrice').isNumeric(),
  body('pricing.perKmPrice').isNumeric()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const transport = new Transport(req.body);
    await transport.save();
    res.status(201).json(transport);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Update transport partner
router.put('/transport/:id', [
  body('name').optional().trim().isLength({ min: 2 }),
  body('type').optional().isIn(['local', 'regional', 'national']),
  body('contactPerson').optional().trim().isLength({ min: 2 }),
  body('phone').optional().isMobilePhone(),
  body('email').optional().isEmail()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const transport = await Transport.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    if (!transport) {
      return res.status(404).json({ message: 'Transport partner not found' });
    }

    res.json(transport);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Delete transport partner
router.delete('/transport/:id', async (req, res) => {
  try {
    const transport = await Transport.findByIdAndDelete(req.params.id);
    if (!transport) {
      return res.status(404).json({ message: 'Transport partner not found' });
    }
    res.json({ message: 'Transport partner deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// ==================== ORDER MANAGEMENT ====================
// Get all orders with pagination and filters
router.get('/orders', async (req, res) => {
  try {
    const { page = 1, limit = 10, status, search } = req.query;
    const skip = (page - 1) * limit;

    let query = {};
    
    if (status) query.status = status;
    if (search) {
      query.$or = [
        { message: { $regex: search, $options: 'i' } }
      ];
    }

    const orders = await Request.find(query)
      .populate('buyer', 'name email phone')
      .populate('seller', 'name email phone')
      .populate('product', 'name price images')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Request.countDocuments(query);

    res.json({
      orders,
      totalPages: Math.ceil(total / limit),
      currentPage: parseInt(page),
      total
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Update order status
router.patch('/orders/:id/status', [
  body('status').isIn(['pending', 'accepted', 'rejected', 'completed', 'cancelled'])
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const order = await Request.findByIdAndUpdate(
      req.params.id,
      { status: req.body.status },
      { new: true }
    ).populate('buyer', 'name email')
     .populate('seller', 'name email')
     .populate('product', 'name');

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    res.json(order);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// ==================== PRODUCT PRICE CONTROL ====================
// Update product price
router.patch('/products/:id/price', [
  body('price').isNumeric().withMessage('Price must be a number')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const product = await Product.findByIdAndUpdate(
      req.params.id,
      { price: req.body.price },
      { new: true }
    );

    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    res.json(product);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// ==================== REPORTS ====================
// Generate sales report
router.get('/reports/sales', async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    let dateFilter = {};
    if (startDate && endDate) {
      dateFilter = {
        createdAt: {
          $gte: new Date(startDate),
          $lte: new Date(endDate)
        }
      };
    }

    const salesReport = await Request.aggregate([
      { $match: { ...dateFilter, status: 'completed' } },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' },
            day: { $dayOfMonth: '$createdAt' }
          },
          totalSales: { $sum: '$totalAmount' },
          orderCount: { $sum: 1 }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 } }
    ]);

    res.json(salesReport);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Generate user activity report
router.get('/reports/users', async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    let dateFilter = {};
    if (startDate && endDate) {
      dateFilter = {
        createdAt: {
          $gte: new Date(startDate),
          $lte: new Date(endDate)
        }
      };
    }

    const userReport = await User.aggregate([
      { $match: dateFilter },
      {
        $group: {
          _id: '$role',
          count: { $sum: 1 },
          verifiedCount: {
            $sum: { $cond: ['$isVerified', 1, 0] }
          }
        }
      }
    ]);

    res.json(userReport);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;

