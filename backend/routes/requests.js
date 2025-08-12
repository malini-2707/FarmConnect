const express = require('express');
const { body, validationResult } = require('express-validator');
const Request = require('../models/Request');
const Product = require('../models/Product');
const auth = require('../middleware/auth');

const router = express.Router();

// Create a new request (buyers only)
router.post('/', auth, [
  body('product').isMongoId().withMessage('Valid product ID is required'),
  body('quantity').isFloat({ min: 1 }).withMessage('Quantity must be at least 1'),
  body('message').optional().trim()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    if (req.user.role !== 'buyer') {
      return res.status(403).json({ message: 'Only buyers can create requests' });
    }

    const { product: productId, quantity, message, proposedPrice, deliveryAddress, deliveryDate } = req.body;

    // Check if product exists and is available
    const product = await Product.findById(productId).populate('seller');
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    if (!product.isAvailable) {
      return res.status(400).json({ message: 'Product is not available' });
    }

    if (quantity > product.quantity) {
      return res.status(400).json({ message: 'Requested quantity exceeds available stock' });
    }

    // Create request
    const request = new Request({
      buyer: req.user.userId,
      seller: product.seller._id,
      product: productId,
      quantity,
      message,
      proposedPrice: proposedPrice || product.price * quantity,
      deliveryAddress,
      deliveryDate: deliveryDate ? new Date(deliveryDate) : undefined,
      totalAmount: (proposedPrice || product.price) * quantity
    });

    await request.save();
    await request.populate(['buyer', 'seller', 'product']);

    // Emit real-time notification to seller
    req.io.to(product.seller._id.toString()).emit('new-request', {
      request,
      message: `New request for ${product.name} from ${req.userDoc.name}`
    });

    res.status(201).json({
      message: 'Request created successfully',
      request
    });
  } catch (error) {
    console.error('Create request error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get requests for current user
router.get('/my-requests', auth, async (req, res) => {
  try {
    const { status, page = 1, limit = 10 } = req.query;
    
    let query = {};
    if (req.user.role === 'buyer') {
      query.buyer = req.user.userId;
    } else {
      query.seller = req.user.userId;
    }

    if (status && status !== 'all') {
      query.status = status;
    }

    const requests = await Request.find(query)
      .populate('buyer', 'name email phone')
      .populate('seller', 'name email phone')
      .populate('product', 'name images price unit')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .exec();

    const total = await Request.countDocuments(query);

    res.json({
      requests,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total
    });
  } catch (error) {
    console.error('Get requests error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get single request
router.get('/:id', auth, async (req, res) => {
  try {
    const request = await Request.findById(req.params.id)
      .populate('buyer', 'name email phone address')
      .populate('seller', 'name email phone address')
      .populate('product');

    if (!request) {
      return res.status(404).json({ message: 'Request not found' });
    }

    // Check authorization
    if (request.buyer._id.toString() !== req.user.userId && 
        request.seller._id.toString() !== req.user.userId) {
      return res.status(403).json({ message: 'Not authorized to view this request' });
    }

    res.json(request);
  } catch (error) {
    console.error('Get request error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update request status (sellers can accept/reject, buyers can cancel)
router.patch('/:id/status', auth, async (req, res) => {
  try {
    const { status } = req.body;
    const validStatuses = ['accepted', 'rejected', 'completed', 'cancelled'];
    
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ message: 'Invalid status' });
    }

    const request = await Request.findById(req.params.id)
      .populate('buyer', 'name')
      .populate('seller', 'name')
      .populate('product', 'name');

    if (!request) {
      return res.status(404).json({ message: 'Request not found' });
    }

    // Authorization checks
    if (status === 'cancelled' && request.buyer._id.toString() !== req.user.userId) {
      return res.status(403).json({ message: 'Only buyers can cancel requests' });
    }

    if (['accepted', 'rejected', 'completed'].includes(status) && 
        request.seller._id.toString() !== req.user.userId) {
      return res.status(403).json({ message: 'Only sellers can accept/reject/complete requests' });
    }

    // Update status
    request.status = status;
    await request.save();

    // Emit real-time notification
    const notificationTarget = status === 'cancelled' ? request.seller._id : request.buyer._id;
    const notificationMessage = `Request for ${request.product.name} has been ${status}`;
    
    req.io.to(notificationTarget.toString()).emit('request-status-update', {
      request,
      message: notificationMessage
    });

    res.json({
      message: `Request ${status} successfully`,
      request
    });
  } catch (error) {
    console.error('Update request status error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete request
router.delete('/:id', auth, async (req, res) => {
  try {
    const request = await Request.findById(req.params.id);
    
    if (!request) {
      return res.status(404).json({ message: 'Request not found' });
    }

    // Only buyer can delete their own requests
    if (request.buyer.toString() !== req.user.userId) {
      return res.status(403).json({ message: 'Not authorized to delete this request' });
    }

    await Request.findByIdAndDelete(req.params.id);

    res.json({ message: 'Request deleted successfully' });
  } catch (error) {
    console.error('Delete request error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
