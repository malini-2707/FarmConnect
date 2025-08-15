const express = require('express');
const { body, validationResult } = require('express-validator');
const Delivery = require('../models/Delivery');
const Order = require('../models/Order');
const User = require('../models/User');
const auth = require('../middleware/auth');
const roleAuth = require('../middleware/roleAuth');

const router = express.Router();

// Get assigned deliveries for delivery partner
router.get('/assigned', auth, roleAuth(['delivery_partner']), async (req, res) => {
  try {
    const { status, page = 1, limit = 10 } = req.query;
    const skip = (page - 1) * limit;

    let query = { deliveryPartner: req.user.id };
    if (status && status !== 'all') {
      query.status = status;
    }

    const deliveries = await Delivery.find(query)
      .populate({
        path: 'order',
        populate: [
          { path: 'customer', select: 'name phone address' },
          { path: 'farmer', select: 'name phone address' },
          { path: 'products.product', select: 'name images' }
        ]
      })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Delivery.countDocuments(query);

    res.json({
      deliveries,
      pagination: {
        current: parseInt(page),
        total: Math.ceil(total / limit),
        hasNext: page * limit < total,
        hasPrev: page > 1
      }
    });
  } catch (error) {
    console.error('Get assigned deliveries error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Accept delivery assignment
router.put('/:id/accept', auth, roleAuth(['delivery_partner']), async (req, res) => {
  try {
    const delivery = await Delivery.findById(req.params.id);

    if (!delivery) {
      return res.status(404).json({ message: 'Delivery not found' });
    }

    if (delivery.deliveryPartner.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Access denied' });
    }

    if (delivery.status !== 'assigned') {
      return res.status(400).json({ message: 'Delivery is not in assigned status' });
    }

    // Update delivery status
    await delivery.updateStatus('accepted');

    // Update order status
    await Order.findByIdAndUpdate(delivery.order, {
      orderStatus: 'assigned_to_delivery'
    });

    // Emit real-time update
    if (req.io) {
      const order = await Order.findById(delivery.order);
      if (order) {
        req.io.to(order.customer.toString()).emit('delivery-assigned', {
          orderId: order._id,
          deliveryPartner: req.user.name
        });
      }
    }

    res.json({ message: 'Delivery accepted successfully', delivery });
  } catch (error) {
    console.error('Accept delivery error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update delivery status
router.put('/:id/status', [
  auth,
  roleAuth(['delivery_partner']),
  body('status').isIn(['picked_up', 'in_transit', 'delivered']).withMessage('Invalid status'),
  body('note').optional().trim(),
  body('latitude').optional().isFloat(),
  body('longitude').optional().isFloat()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { status, note, latitude, longitude } = req.body;
    const delivery = await Delivery.findById(req.params.id);

    if (!delivery) {
      return res.status(404).json({ message: 'Delivery not found' });
    }

    if (delivery.deliveryPartner.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Access denied' });
    }

    // Update delivery status
    const location = latitude && longitude ? { latitude, longitude } : null;
    await delivery.updateStatus(status, location, note);

    // Update order status accordingly
    let orderStatus;
    switch (status) {
      case 'picked_up':
        orderStatus = 'picked_up';
        break;
      case 'in_transit':
        orderStatus = 'in_transit';
        break;
      case 'delivered':
        orderStatus = 'delivered';
        break;
    }

    if (orderStatus) {
      await Order.findByIdAndUpdate(delivery.order, { orderStatus });
    }

    // Emit real-time update
    if (req.io) {
      const order = await Order.findById(delivery.order);
      if (order) {
        req.io.to(order.customer.toString()).emit('delivery-status-updated', {
          orderId: order._id,
          status: status,
          location: location
        });
      }
    }

    res.json({ message: 'Delivery status updated successfully', delivery });
  } catch (error) {
    console.error('Update delivery status error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update delivery partner location
router.put('/:id/location', [
  auth,
  roleAuth(['delivery_partner']),
  body('latitude').isFloat().withMessage('Valid latitude is required'),
  body('longitude').isFloat().withMessage('Valid longitude is required'),
  body('speed').optional().isFloat({ min: 0 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { latitude, longitude, speed = 0 } = req.body;
    const delivery = await Delivery.findById(req.params.id);

    if (!delivery) {
      return res.status(404).json({ message: 'Delivery not found' });
    }

    if (delivery.deliveryPartner.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Access denied' });
    }

    // Add route point
    await delivery.addRoutePoint(latitude, longitude, speed);

    // Update delivery partner's current location
    await User.findByIdAndUpdate(req.user.id, {
      'deliveryDetails.currentLocation': { latitude, longitude }
    });

    // Emit real-time location update
    if (req.io) {
      const order = await Order.findById(delivery.order);
      if (order) {
        req.io.to(order.customer.toString()).emit('delivery-location-updated', {
          orderId: order._id,
          latitude,
          longitude,
          timestamp: new Date()
        });
      }
    }

    res.json({ message: 'Location updated successfully' });
  } catch (error) {
    console.error('Update location error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get delivery details
router.get('/:id', auth, async (req, res) => {
  try {
    const delivery = await Delivery.findById(req.params.id)
      .populate({
        path: 'order',
        populate: [
          { path: 'customer', select: 'name phone address' },
          { path: 'farmer', select: 'name phone address' },
          { path: 'products.product', select: 'name images price unit' }
        ]
      })
      .populate('deliveryPartner', 'name phone');

    if (!delivery) {
      return res.status(404).json({ message: 'Delivery not found' });
    }

    // Check access permissions
    const order = await Order.findById(delivery.order);
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    if (order.customer.toString() !== req.user.id && 
        order.farmer.toString() !== req.user.id && 
        delivery.deliveryPartner.toString() !== req.user.id &&
        req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied' });
    }

    res.json(delivery);
  } catch (error) {
    console.error('Get delivery error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Complete delivery
router.put('/:id/complete', [
  auth,
  roleAuth(['delivery_partner']),
  body('customerSignature').optional().trim(),
  body('customerPhoto').optional().trim(),
  body('customerNote').optional().trim()
], async (req, res) => {
  try {
    const { customerSignature, customerPhoto, customerNote } = req.body;
    const delivery = await Delivery.findById(req.params.id);

    if (!delivery) {
      return res.status(404).json({ message: 'Delivery not found' });
    }

    if (delivery.deliveryPartner.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Access denied' });
    }

    if (delivery.status !== 'in_transit') {
      return res.status(400).json({ message: 'Delivery must be in transit to complete' });
    }

    // Update delivery status
    delivery.status = 'delivered';
    delivery.deliveryTime = new Date();
    delivery.deliveryConfirmation = {
      customerSignature,
      customerPhoto,
      deliveredAt: new Date(),
      customerNote
    };

    // Calculate performance metrics
    if (delivery.pickupTime && delivery.estimatedDuration) {
      const actualDuration = Math.round((delivery.deliveryTime - delivery.pickupTime) / (1000 * 60));
      delivery.actualDuration = actualDuration;
      delivery.performance = {
        onTimeDelivery: actualDuration <= delivery.estimatedDuration,
        deliveryTime: actualDuration
      };
    }

    await delivery.save();

    // Update order status
    await Order.findByIdAndUpdate(delivery.order, { orderStatus: 'delivered' });

    // Emit real-time update
    if (req.io) {
      const order = await Order.findById(delivery.order);
      if (order) {
        req.io.to(order.customer.toString()).emit('delivery-completed', {
          orderId: order._id,
          deliveryTime: delivery.deliveryTime
        });
      }
    }

    res.json({ message: 'Delivery completed successfully', delivery });
  } catch (error) {
    console.error('Complete delivery error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get delivery route
router.get('/:id/route', auth, async (req, res) => {
  try {
    const delivery = await Delivery.findById(req.params.id).select('route pickupLocation deliveryLocation');

    if (!delivery) {
      return res.status(404).json({ message: 'Delivery not found' });
    }

    // Check access permissions
    const order = await Order.findById(delivery.order);
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    if (order.customer.toString() !== req.user.id && 
        order.farmer.toString() !== req.user.id && 
        delivery.deliveryPartner.toString() !== req.user.id &&
        req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied' });
    }

    res.json({
      route: delivery.route,
      pickupLocation: delivery.pickupLocation,
      deliveryLocation: delivery.deliveryLocation
    });
  } catch (error) {
    console.error('Get delivery route error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update delivery partner availability
router.put('/availability', [
  auth,
  roleAuth(['delivery_partner']),
  body('isAvailable').isBoolean().withMessage('isAvailable must be a boolean'),
  body('isOnline').isBoolean().withMessage('isOnline must be a boolean')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { isAvailable, isOnline } = req.body;

    await User.findByIdAndUpdate(req.user.id, {
      'deliveryDetails.isAvailable': isAvailable,
      'deliveryDetails.isOnline': isOnline
    });

    res.json({ message: 'Availability updated successfully' });
  } catch (error) {
    console.error('Update availability error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
