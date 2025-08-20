const express = require('express');
const mongoose = require('mongoose');
const Order = require('../models/Order');
const User = require('../models/User');
const DeliveryOrder = require('../models/DeliveryOrder');
const auth = require('../middleware/auth');
const roleAuth = require('../middleware/roleAuth');

const router = express.Router();

// Calculate distance between two coordinates using Haversine formula
const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371; // Earth's radius in kilometers
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c; // Distance in kilometers
};

// Find nearby delivery partners for a new order
const findNearbyDeliveryPartners = async (orderLocation, maxDistance = 10) => {
  try {
    const deliveryPartners = await User.find({
      role: 'delivery_partner',
      'deliveryDetails.isOnline': true,
      'deliveryDetails.isAvailable': true,
      'deliveryDetails.currentLocation.latitude': { $exists: true },
      'deliveryDetails.currentLocation.longitude': { $exists: true }
    }).select('name phone deliveryDetails.currentLocation deliveryDetails.vehicleType');

    const nearbyPartners = deliveryPartners.filter(partner => {
      const distance = calculateDistance(
        orderLocation.latitude,
        orderLocation.longitude,
        partner.deliveryDetails.currentLocation.latitude,
        partner.deliveryDetails.currentLocation.longitude
      );
      return distance <= maxDistance;
    }).map(partner => ({
      ...partner.toObject(),
      distance: calculateDistance(
        orderLocation.latitude,
        orderLocation.longitude,
        partner.deliveryDetails.currentLocation.latitude,
        partner.deliveryDetails.currentLocation.longitude
      )
    })).sort((a, b) => a.distance - b.distance);

    return nearbyPartners;
  } catch (error) {
    console.error('Error finding nearby delivery partners:', error);
    return [];
  }
};

// Notify delivery partners about new order
router.post('/notify-delivery-partners', auth, async (req, res) => {
  try {
    const { orderId, deliveryLocation, maxDistance = 10 } = req.body;

    if (!orderId || !deliveryLocation || !deliveryLocation.latitude || !deliveryLocation.longitude) {
      return res.status(400).json({ 
        message: 'Order ID and delivery location coordinates are required' 
      });
    }

    // Find the order
    const order = await Order.findById(orderId).populate('customer farmer');
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    // Find nearby delivery partners
    const nearbyPartners = await findNearbyDeliveryPartners(deliveryLocation, maxDistance);

    if (nearbyPartners.length === 0) {
      return res.status(200).json({ 
        message: 'No delivery partners available in the area',
        availablePartners: 0
      });
    }

    // Create notification data
    const notificationData = {
      orderId: order._id,
      orderNumber: order.orderNumber,
      customer: {
        name: order.customer.name,
        phone: order.customer.phone,
        address: order.deliveryAddress
      },
      deliveryLocation,
      estimatedDistance: nearbyPartners[0].distance,
      orderValue: order.totalAmount,
      items: order.products.length,
      urgency: order.priority || 'normal',
      timestamp: new Date()
    };

    // Send real-time notifications to nearby delivery partners
    if (req.io) {
      nearbyPartners.forEach(partner => {
        req.io.to(`delivery_partner_${partner._id}`).emit('new-order-notification', {
          ...notificationData,
          distance: partner.distance,
          partnerId: partner._id
        });
      });
    }

    // Log notification activity
    console.log(`Order ${order.orderNumber} notification sent to ${nearbyPartners.length} delivery partners`);

    res.json({
      message: 'Notifications sent successfully',
      availablePartners: nearbyPartners.length,
      notifiedPartners: nearbyPartners.map(p => ({
        id: p._id,
        name: p.name,
        distance: p.distance,
        vehicleType: p.deliveryDetails.vehicleType
      }))
    });

  } catch (error) {
    console.error('Error notifying delivery partners:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get available orders for delivery partner based on location
router.get('/available-orders', auth, roleAuth(['delivery_partner']), async (req, res) => {
  try {
    const { latitude, longitude, maxDistance = 10, page = 1, limit = 10 } = req.query;

    if (!latitude || !longitude) {
      return res.status(400).json({ 
        message: 'Current location coordinates are required' 
      });
    }

    const skip = (page - 1) * limit;
    const currentLocation = { latitude: parseFloat(latitude), longitude: parseFloat(longitude) };

    // Find orders that need delivery assignment
    const availableOrders = await Order.find({
      orderStatus: { $in: ['confirmed', 'ready_for_pickup'] },
      assignedDeliveryPartner: { $exists: false },
      'deliveryAddress.coordinates.latitude': { $exists: true },
      'deliveryAddress.coordinates.longitude': { $exists: true }
    })
    .populate('customer', 'name phone')
    .populate('farmer', 'name phone address')
    .populate('products.product', 'name images')
    .sort({ createdAt: -1 })
    .limit(parseInt(limit) * 2); // Get more to filter by distance

    // Filter by distance and calculate distance for each order
    const nearbyOrders = availableOrders.map(order => {
      const distance = calculateDistance(
        currentLocation.latitude,
        currentLocation.longitude,
        order.deliveryAddress.coordinates.latitude,
        order.deliveryAddress.coordinates.longitude
      );
      return {
        ...order.toObject(),
        distance: Math.round(distance * 100) / 100 // Round to 2 decimal places
      };
    })
    .filter(order => order.distance <= maxDistance)
    .sort((a, b) => a.distance - b.distance)
    .slice(skip, skip + parseInt(limit));

    const total = nearbyOrders.length;

    res.json({
      orders: nearbyOrders,
      pagination: {
        current: parseInt(page),
        total: Math.ceil(total / limit),
        hasNext: page * limit < total,
        hasPrev: page > 1
      },
      currentLocation,
      searchRadius: maxDistance
    });

  } catch (error) {
    console.error('Error fetching available orders:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Accept order by delivery partner
router.post('/accept-order/:orderId', auth, roleAuth(['delivery_partner']), async (req, res) => {
  try {
    const { orderId } = req.params;
    const { estimatedPickupTime, notes } = req.body;

    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    if (order.assignedDeliveryPartner) {
      return res.status(400).json({ message: 'Order already assigned to another delivery partner' });
    }

    if (!['confirmed', 'ready_for_pickup'].includes(order.orderStatus)) {
      return res.status(400).json({ message: 'Order is not available for pickup' });
    }

    // Update order with delivery partner assignment
    order.assignedDeliveryPartner = req.user.id;
    order.orderStatus = 'assigned_to_delivery';
    order.deliveryNotes = notes;
    order.estimatedPickupTime = estimatedPickupTime;
    await order.save();

    // Update delivery partner availability
    await User.findByIdAndUpdate(req.user.id, {
      'deliveryDetails.isAvailable': false
    });

    // Create delivery record
    const delivery = new DeliveryOrder({
      orderNumber: `DO${Date.now()}`,
      customer: order.customer,
      warehouse: order.warehouse,
      deliveryPartner: req.user.id,
      products: order.products,
      deliveryAddress: order.deliveryAddress,
      deliveryDetails: {
        serviceType: 'standard',
        preferredDate: new Date(),
        preferredTimeSlot: 'anytime',
        specialInstructions: notes
      },
      pricing: {
        subtotal: order.totalAmount,
        deliveryFee: 50, // Default delivery fee
        total: order.totalAmount + 50
      },
      status: 'confirmed'
    });
    await delivery.save();

    // Notify customer about delivery partner assignment
    if (req.io) {
      req.io.to(`customer_${order.customer}`).emit('delivery-partner-assigned', {
        orderId: order._id,
        deliveryPartner: {
          name: req.user.name,
          phone: req.user.phone,
          vehicleType: req.user.deliveryDetails.vehicleType
        },
        estimatedPickupTime
      });
    }

    // Notify other delivery partners that order is no longer available
    req.io.emit('order-assigned', { orderId: order._id });

    res.json({
      message: 'Order accepted successfully',
      order: order,
      delivery: delivery
    });

  } catch (error) {
    console.error('Error accepting order:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update delivery partner location and availability
router.put('/update-location', auth, roleAuth(['delivery_partner']), async (req, res) => {
  try {
    const { latitude, longitude, isAvailable = true, isOnline = true } = req.body;

    if (!latitude || !longitude) {
      return res.status(400).json({ message: 'Location coordinates are required' });
    }

    await User.findByIdAndUpdate(req.user.id, {
      'deliveryDetails.currentLocation': { latitude, longitude },
      'deliveryDetails.isAvailable': isAvailable,
      'deliveryDetails.isOnline': isOnline,
      'deliveryDetails.lastLocationUpdate': new Date()
    });

    // If going online, check for nearby pending orders
    if (isOnline && isAvailable) {
      const nearbyOrders = await Order.find({
        orderStatus: { $in: ['confirmed', 'ready_for_pickup'] },
        assignedDeliveryPartner: { $exists: false },
        'deliveryAddress.coordinates.latitude': { $exists: true },
        'deliveryAddress.coordinates.longitude': { $exists: true }
      }).limit(5);

      const ordersWithDistance = nearbyOrders.map(order => {
        const distance = calculateDistance(
          latitude,
          longitude,
          order.deliveryAddress.coordinates.latitude,
          order.deliveryAddress.coordinates.longitude
        );
        return { ...order.toObject(), distance };
      }).filter(order => order.distance <= 10);

      if (ordersWithDistance.length > 0 && req.io) {
        req.io.to(`delivery_partner_${req.user.id}`).emit('nearby-orders-available', {
          count: ordersWithDistance.length,
          orders: ordersWithDistance.slice(0, 3) // Send top 3 closest orders
        });
      }
    }

    res.json({ 
      message: 'Location and availability updated successfully',
      location: { latitude, longitude },
      isAvailable,
      isOnline
    });

  } catch (error) {
    console.error('Error updating location:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get delivery partner statistics
router.get('/stats', auth, roleAuth(['delivery_partner']), async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const thisWeek = new Date();
    thisWeek.setDate(thisWeek.getDate() - 7);

    const stats = await DeliveryOrder.aggregate([
      {
        $match: {
          deliveryPartner: new mongoose.Types.ObjectId(req.user.id)
        }
      },
      {
        $group: {
          _id: null,
          totalDeliveries: { $sum: 1 },
          completedDeliveries: {
            $sum: { $cond: [{ $eq: ['$status', 'delivered'] }, 1, 0] }
          },
          todayDeliveries: {
            $sum: { $cond: [{ $gte: ['$createdAt', today] }, 1, 0] }
          },
          weekDeliveries: {
            $sum: { $cond: [{ $gte: ['$createdAt', thisWeek] }, 1, 0] }
          },
          totalEarnings: { $sum: '$pricing.deliveryFee' },
          avgRating: { $avg: '$customerFeedback.deliveryRating' }
        }
      }
    ]);

    const result = stats[0] || {
      totalDeliveries: 0,
      completedDeliveries: 0,
      todayDeliveries: 0,
      weekDeliveries: 0,
      totalEarnings: 0,
      avgRating: 0
    };

    res.json(result);

  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
