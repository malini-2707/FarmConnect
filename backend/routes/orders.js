const express = require('express');
const { body, validationResult } = require('express-validator');
const Order = require('../models/Order');
const Product = require('../models/Product');
const Payment = require('../models/Payment');
const Delivery = require('../models/Delivery');
const User = require('../models/User');
const auth = require('../middleware/auth');
const roleAuth = require('../middleware/roleAuth');

const router = express.Router();

// Create new order (Customer only)
router.post('/', [
  auth,
  body('products').isArray({ min: 1 }).withMessage('At least one product is required'),
  body('products.*.product').isMongoId().withMessage('Invalid product ID'),
  body('products.*.quantity').isInt({ min: 1 }).withMessage('Quantity must be at least 1'),
  body('deliveryAddress.street').notEmpty().withMessage('Delivery address is required'),
  body('deliveryAddress.city').notEmpty().withMessage('City is required'),
  body('deliveryAddress.state').notEmpty().withMessage('State is required'),
  body('deliveryAddress.zipCode').notEmpty().withMessage('ZIP code is required'),
  body('paymentMethod').isIn(['upi', 'card', 'net_banking', 'cod']).withMessage('Invalid payment method')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    // Check if user is customer
    if (req.userDoc.role !== 'customer') {
      return res.status(403).json({ message: 'Only customers can place orders' });
    }

    const { products, deliveryAddress, deliveryInstructions, paymentMethod } = req.body;
    const customerId = req.user.id;

    // Validate products and calculate totals
    let totalAmount = 0;
    const orderProducts = [];

    for (const item of products) {
      const product = await Product.findById(item.product);
      if (!product) {
        return res.status(400).json({ message: `Product ${item.product} not found` });
      }

      // Skip availability checks that might not exist
      if (product.quantity && product.quantity < item.quantity) {
        return res.status(400).json({ message: `Product ${product.name} is not available in requested quantity` });
      }

      // Skip min/max order quantity checks if fields don't exist
      if (product.minOrderQuantity && item.quantity < product.minOrderQuantity) {
        return res.status(400).json({ 
          message: `Minimum quantity for ${product.name} is ${product.minOrderQuantity}` 
        });
      }
      
      if (product.maxOrderQuantity && item.quantity > product.maxOrderQuantity) {
        return res.status(400).json({ 
          message: `Maximum quantity for ${product.name} is ${product.maxOrderQuantity}` 
        });
      }

      const itemTotal = product.price * item.quantity;
      totalAmount += itemTotal;

      orderProducts.push({
        product: product._id,
        quantity: item.quantity,
        price: product.price,
        total: itemTotal
      });
    }

    // Get farmer ID from first product
    const firstProduct = await Product.findById(products[0].product);
    if (!firstProduct) {
      return res.status(400).json({ message: 'Product not found' });
    }
    const farmerId = firstProduct.seller;

    // Create order with orderNumber
    const orderNumber = 'ORD' + Date.now() + Math.random().toString(36).substr(2, 5).toUpperCase();
    
    const order = new Order({
      orderNumber: orderNumber,
      customer: customerId,
      farmer: farmerId,
      products: orderProducts,
      deliveryAddress,
      deliveryInstructions,
      totalAmount,
      finalAmount: totalAmount, // Will be updated with delivery fee
      paymentMethod
    });

    await order.save();

    // Create initial payment record (pending)
    try {
      const payment = new Payment({
        order: order._id,
        amount: totalAmount,
        currency: 'INR',
        paymentMethod,
        paymentStatus: paymentMethod === 'cod' ? 'pending' : 'pending',
        totalAmount: totalAmount
      });
      await payment.save();
    } catch (e) {
      console.error('Payment record creation error:', e);
    }

    // Update product quantities
    for (const item of products) {
      await Product.findByIdAndUpdate(item.product, {
        $inc: { quantity: -item.quantity }
      });
    }

    // Notify all available delivery partners about new order
    const availableDeliveryPartners = await User.find({
      role: 'delivery_partner'
    }).select('_id');

    // Emit real-time updates to all relevant parties
    if (req.io) {
      // Notify farmer about new order
      req.io.to(farmerId.toString()).emit('new-order', { orderId: order._id });
      
      // Notify all delivery partners about new order opportunity
      if (availableDeliveryPartners.length > 0) {
        availableDeliveryPartners.forEach(partner => {
          req.io.to(partner._id.toString()).emit('new-order-available', { 
            orderId: order._id,
            orderNumber: order.orderNumber,
            deliveryAddress: order.deliveryAddress,
            totalAmount: order.totalAmount
          });
        });
      }
    }

    res.status(201).json({
      message: 'Order created successfully',
      order: {
        id: order._id,
        orderNumber: order.orderNumber,
        totalAmount: order.totalAmount,
        status: order.orderStatus
      }
    });
  } catch (error) {
    console.error('Create order error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get customer orders
router.get('/customer', auth, async (req, res) => {
  try {
    const { status, page = 1, limit = 10 } = req.query;
    const skip = (page - 1) * limit;

    let query = { customer: req.user.id };
    if (status && status !== 'all') {
      query.orderStatus = status;
    }

    const orders = await Order.find(query)
      .populate('farmer', 'name phone')
      .populate('products.product', 'name images price')
      .populate('deliveryPartner', 'name phone')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Order.countDocuments(query);

    res.json({
      orders,
      pagination: {
        current: parseInt(page),
        total: Math.ceil(total / limit),
        hasNext: page * limit < total,
        hasPrev: page > 1
      }
    });
  } catch (error) {
    console.error('Get customer orders error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get delivery partner orders
router.get('/delivery', auth, async (req, res) => {
  try {
    const { status, page = 1, limit = 10 } = req.query;
    const skip = (page - 1) * limit;

    let query = { deliveryPartner: req.user.id };
    if (status && status !== 'all') {
      query.orderStatus = status;
    }

    const orders = await Order.find(query)
      .populate('customer', 'name phone address')
      .populate('farmer', 'name phone address')
      .populate('products.product', 'name images price')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Order.countDocuments(query);

    res.json({
      orders,
      pagination: {
        current: parseInt(page),
        total: Math.ceil(total / limit),
        hasNext: page * limit < total,
        hasPrev: page > 1
      }
    });
  } catch (error) {
    console.error('Get delivery partner orders error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get farmer orders
router.get('/farmer', auth, async (req, res) => {
  try {
    const { status, page = 1, limit = 10 } = req.query;
    const skip = (page - 1) * limit;

    let query = { farmer: req.user.id };
    if (status && status !== 'all') {
      query.orderStatus = status;
    }

    const orders = await Order.find(query)
      .populate('customer', 'name phone address')
      .populate('products.product', 'name images price')
      .populate('deliveryPartner', 'name phone')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Order.countDocuments(query);

    res.json({
      orders,
      pagination: {
        current: parseInt(page),
        total: Math.ceil(total / limit),
        hasNext: page * limit < total,
        hasPrev: page > 1
      }
    });
  } catch (error) {
    console.error('Get farmer orders error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get order details
router.get('/:id', auth, async (req, res) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate('customer', 'name phone address')
      .populate('farmer', 'name phone address')
      .populate('products.product', 'name images price unit')
      .populate('deliveryPartner', 'name phone')
      .populate('statusHistory.updatedBy', 'name');

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    // Check if user has access to this order
    if (order.customer.toString() !== req.user.id && 
        order.farmer.toString() !== req.user.id && 
        (order.deliveryPartner && order.deliveryPartner.toString() !== req.user.id) &&
        req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied' });
    }

    res.json(order);
  } catch (error) {
    console.error('Get order error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update order status (Farmer and Delivery Partner)
router.put('/:id/status', [
  auth,
  body('status').custom((value, { req }) => {
    const userRole = req.user.role;
    const allowedStatuses = {
      farmer: ['confirmed', 'preparing', 'ready_for_pickup', 'cancelled'],
      delivery_partner: ['picked_up', 'in_transit', 'delivered']
    };
    
    if (!allowedStatuses[userRole] || !allowedStatuses[userRole].includes(value)) {
      throw new Error(`Invalid status for ${userRole}`);
    }
    return true;
  }),
  body('note').optional().trim()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { status, note } = req.body;
    const order = await Order.findById(req.params.id);

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    // Check access based on user role
    if (req.user.role === 'farmer' && order.farmer.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Access denied' });
    }
    
    if (req.user.role === 'delivery_partner' && 
        (!order.deliveryPartner || order.deliveryPartner.toString() !== req.user.id)) {
      return res.status(403).json({ message: 'Access denied' });
    }

    // Update order status
    await order.updateStatus(status, req.user.id, note);

    // Emit real-time updates to all relevant parties
    if (req.io) {
      // Always notify customer
      req.io.to(order.customer.toString()).emit('order-status-updated', {
        orderId: order._id,
        status: status
      });
      
      // Notify farmer if update is from delivery partner
      if (req.user.role === 'delivery_partner') {
        req.io.to(order.farmer.toString()).emit('order-status-updated', {
          orderId: order._id,
          status: status
        });
      }
      
      // Notify delivery partner if update is from farmer and order is ready for pickup
      if (req.user.role === 'farmer' && status === 'ready_for_pickup' && order.deliveryPartner) {
        req.io.to(order.deliveryPartner.toString()).emit('order-ready-for-pickup', {
          orderId: order._id,
          status: status
        });
      }
    }

    res.json({ message: 'Order status updated successfully', order });
  } catch (error) {
    console.error('Update order status error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Cancel order (Customer only)
router.put('/:id/cancel', [
  auth,
  body('reason').notEmpty().withMessage('Cancellation reason is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { reason } = req.body;
    const order = await Order.findById(req.params.id);

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    if (order.customer.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Access denied' });
    }

    if (order.orderStatus !== 'pending' && order.orderStatus !== 'confirmed') {
      return res.status(400).json({ message: 'Order cannot be cancelled at this stage' });
    }

    // Update order status
    order.orderStatus = 'cancelled';
    order.cancellationReason = reason;
    order.cancelledBy = req.user.id;
    order.cancellationTime = new Date();
    order.statusHistory.push({
      status: 'cancelled',
      timestamp: new Date(),
      updatedBy: req.user.id,
      note: `Cancelled by customer: ${reason}`
    });

    await order.save();

    // Restore product quantities
    for (const item of order.products) {
      await Product.findByIdAndUpdate(item.product, {
        $inc: { quantity: item.quantity }
      });
    }

    // Emit real-time update
    if (req.io) {
      req.io.to(order.farmer.toString()).emit('order-cancelled', {
        orderId: order._id,
        reason: reason
      });
    }

    res.json({ message: 'Order cancelled successfully', order });
  } catch (error) {
    console.error('Cancel order error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Rate order (Customer only)
router.post('/:id/rate', [
  auth,
  roleAuth(['customer']),
  body('rating').isInt({ min: 1, max: 5 }).withMessage('Rating must be between 1 and 5'),
  body('review').optional().trim()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { rating, review } = req.body;
    const order = await Order.findById(req.params.id);

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    if (order.customer.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Access denied' });
    }

    if (order.orderStatus !== 'delivered') {
      return res.status(400).json({ message: 'Order must be delivered before rating' });
    }

    if (order.customerRating) {
      return res.status(400).json({ message: 'Order already rated' });
    }

    // Update order rating
    order.customerRating = rating;
    order.customerReview = review;
    await order.save();

    // Update farmer rating
    const User = require('../models/User');
    const farmer = await User.findById(order.farmer);
    if (farmer) {
      const totalRating = farmer.totalRatings + rating;
      const newRating = (farmer.rating * farmer.totalRatings + rating) / (farmer.totalRatings + 1);
      farmer.rating = newRating;
      farmer.totalRatings += 1;
      await farmer.save();
    }

    res.json({ message: 'Order rated successfully', order });
  } catch (error) {
    console.error('Rate order error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Accept order (Delivery Partner only)
router.post('/:id/accept', [
  auth,
  roleAuth(['delivery_partner'])
], async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    // Check if order already has a delivery partner
    if (order.deliveryPartner && order.deliveryPartnerStatus === 'accepted') {
      return res.status(400).json({ message: 'Order already accepted by another delivery partner' });
    }

    // Assign delivery partner and update status
    order.deliveryPartner = req.user.id;
    order.deliveryPartnerStatus = 'accepted';
    order.deliveryPartnerAssignedAt = new Date();
    order.deliveryPartnerAcceptedAt = new Date();
    
    await order.save();

    // Emit real-time updates
    if (req.io) {
      // Notify customer and farmer
      req.io.to(order.customer.toString()).emit('delivery-partner-assigned', {
        orderId: order._id,
        deliveryPartnerId: req.user.id
      });
      req.io.to(order.farmer.toString()).emit('delivery-partner-assigned', {
        orderId: order._id,
        deliveryPartnerId: req.user.id
      });
      
      // Notify other delivery partners that order is no longer available
      const otherDeliveryPartners = await User.find({
        role: 'delivery_partner',
        _id: { $ne: req.user.id }
      }).select('_id');
      
      otherDeliveryPartners.forEach(partner => {
        req.io.to(partner._id.toString()).emit('order-taken', { orderId: order._id });
      });
    }

    res.json({ message: 'Order accepted successfully', order });
  } catch (error) {
    console.error('Accept order error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Decline order (Delivery Partner only)
router.post('/:id/decline', [
  auth,
  roleAuth(['delivery_partner'])
], async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    // If this delivery partner was assigned, remove assignment
    if (order.deliveryPartner && order.deliveryPartner.toString() === req.user.id) {
      order.deliveryPartner = null;
      order.deliveryPartnerStatus = 'pending';
      order.deliveryPartnerAssignedAt = null;
      order.deliveryPartnerAcceptedAt = null;
      await order.save();
    }

    res.json({ message: 'Order declined successfully' });
  } catch (error) {
    console.error('Decline order error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get available orders for delivery partners
router.get('/available', [
  auth,
  roleAuth(['delivery_partner'])
], async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const skip = (page - 1) * limit;

    // Find orders without assigned delivery partner or with pending status
    const orders = await Order.find({
      $or: [
        { deliveryPartner: null },
        { deliveryPartnerStatus: 'pending' }
      ],
      orderStatus: { $in: ['pending', 'confirmed', 'preparing', 'ready_for_pickup'] }
    })
      .populate('customer', 'name phone')
      .populate('farmer', 'name phone address')
      .populate('products.product', 'name images price')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Order.countDocuments({
      $or: [
        { deliveryPartner: null },
        { deliveryPartnerStatus: 'pending' }
      ],
      orderStatus: { $in: ['pending', 'confirmed', 'preparing', 'ready_for_pickup'] }
    });

    res.json({
      orders,
      pagination: {
        current: parseInt(page),
        total: Math.ceil(total / limit),
        hasNext: page * limit < total,
        hasPrev: page > 1
      }
    });
  } catch (error) {
    console.error('Get available orders error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
