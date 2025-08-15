const express = require('express');
const { body, validationResult } = require('express-validator');
const Payment = require('../models/Payment');
const Order = require('../models/Order');
const auth = require('../middleware/auth');
const roleAuth = require('../middleware/roleAuth');

const router = express.Router();

// Get payment details
router.get('/:id', auth, async (req, res) => {
  try {
    const payment = await Payment.findById(req.params.id)
      .populate({
        path: 'order',
        populate: [
          { path: 'customer', select: 'name email phone' },
          { path: 'farmer', select: 'name email phone' }
        ]
      });

    if (!payment) {
      return res.status(404).json({ message: 'Payment not found' });
    }

    // Check access permissions
    const order = await Order.findById(payment.order);
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    if (order.customer.toString() !== req.user.id && 
        order.farmer.toString() !== req.user.id &&
        req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied' });
    }

    res.json(payment);
  } catch (error) {
    console.error('Get payment error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Process payment
router.post('/process', [
  auth,
  roleAuth(['customer']),
  body('orderId').isMongoId().withMessage('Valid order ID is required'),
  body('paymentMethod').isIn(['upi', 'card', 'net_banking']).withMessage('Invalid payment method'),
  body('paymentDetails').isObject().withMessage('Payment details are required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { orderId, paymentMethod, paymentDetails } = req.body;

    // Find order
    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    if (order.customer.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Access denied' });
    }

    if (order.paymentStatus === 'paid') {
      return res.status(400).json({ message: 'Order is already paid' });
    }

    // Find existing payment
    let payment = await Payment.findOne({ order: orderId });
    if (!payment) {
      return res.status(404).json({ message: 'Payment record not found' });
    }

    // TODO: Integrate with actual payment gateway (Razorpay, Stripe, etc.)
    // For now, simulate payment processing
    try {
      // Simulate payment gateway call
      const gatewayResponse = await simulatePaymentGateway(paymentMethod, paymentDetails, order.finalAmount);
      
      if (gatewayResponse.success) {
        // Update payment status
        payment.paymentStatus = 'completed';
        payment.gatewayResponse = gatewayResponse;
        payment.gateway = {
          name: 'simulated_gateway',
          orderId: gatewayResponse.orderId,
          paymentId: gatewayResponse.paymentId,
          signature: gatewayResponse.signature
        };
        await payment.save();

        // Update order payment status
        order.paymentStatus = 'paid';
        order.paymentId = payment.transactionId;
        await order.save();

        // Emit real-time update
        if (req.io) {
          req.io.to(order.farmer.toString()).emit('payment-received', {
            orderId: order._id,
            amount: order.finalAmount
          });
        }

        res.json({
          message: 'Payment processed successfully',
          payment: {
            id: payment._id,
            transactionId: payment.transactionId,
            status: payment.paymentStatus,
            amount: payment.amount
          }
        });
      } else {
        // Payment failed
        payment.paymentStatus = 'failed';
        payment.gatewayResponse = gatewayResponse;
        await payment.save();

        res.status(400).json({
          message: 'Payment failed',
          error: gatewayResponse.error
        });
      }
    } catch (gatewayError) {
      // Payment gateway error
      payment.paymentStatus = 'failed';
      payment.gatewayResponse = { error: gatewayError.message };
      await payment.save();

      res.status(500).json({
        message: 'Payment processing error',
        error: gatewayError.message
      });
    }
  } catch (error) {
    console.error('Process payment error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Process COD payment
router.post('/cod', [
  auth,
  roleAuth(['customer']),
  body('orderId').isMongoId().withMessage('Valid order ID is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { orderId } = req.body;

    // Find order
    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    if (order.customer.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Access denied' });
    }

    if (order.paymentMethod !== 'cod') {
      return res.status(400).json({ message: 'Order is not COD' });
    }

    if (order.paymentStatus === 'paid') {
      return res.status(400).json({ message: 'Order is already paid' });
    }

    // Find existing payment
    let payment = await Payment.findOne({ order: orderId });
    if (!payment) {
      return res.status(404).json({ message: 'Payment record not found' });
    }

    // For COD, mark as pending until delivery
    payment.paymentStatus = 'pending';
    await payment.save();

    res.json({
      message: 'COD payment confirmed',
      payment: {
        id: payment._id,
        transactionId: payment.transactionId,
        status: payment.paymentStatus,
        amount: payment.amount
      }
    });
  } catch (error) {
    console.error('COD payment error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Confirm COD payment after delivery
router.post('/cod/confirm', [
  auth,
  roleAuth(['delivery_partner']),
  body('orderId').isMongoId().withMessage('Valid order ID is required'),
  body('amount').isFloat({ min: 0 }).withMessage('Valid amount is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { orderId, amount } = req.body;

    // Find order
    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    if (order.paymentMethod !== 'cod') {
      return res.status(400).json({ message: 'Order is not COD' });
    }

    // Find payment
    const payment = await Payment.findOne({ order: orderId });
    if (!payment) {
      return res.status(404).json({ message: 'Payment record not found' });
    }

    // Update payment status
    payment.paymentStatus = 'completed';
    payment.gatewayResponse = {
      method: 'cod',
      confirmedBy: req.user.id,
      confirmedAt: new Date(),
      amount: amount
    };
    await payment.save();

    // Update order payment status
    order.paymentStatus = 'paid';
    order.paymentId = payment.transactionId;
    await order.save();

    // Emit real-time update
    if (req.io) {
      req.io.to(order.farmer.toString()).emit('cod-payment-confirmed', {
        orderId: order._id,
        amount: amount
      });
    }

    res.json({
      message: 'COD payment confirmed successfully',
      payment: {
        id: payment._id,
        transactionId: payment.transactionId,
        status: payment.paymentStatus,
        amount: payment.amount
      }
    });
  } catch (error) {
    console.error('Confirm COD payment error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get payment history
router.get('/history/:orderId', auth, async (req, res) => {
  try {
    const { orderId } = req.params;

    // Check order access
    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    if (order.customer.toString() !== req.user.id && 
        order.farmer.toString() !== req.user.id &&
        req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied' });
    }

    // Get payment history
    const payments = await Payment.find({ order: orderId })
      .sort({ createdAt: -1 });

    res.json(payments);
  } catch (error) {
    console.error('Get payment history error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Request refund
router.post('/:id/refund', [
  auth,
  roleAuth(['customer']),
  body('reason').notEmpty().withMessage('Refund reason is required'),
  body('amount').isFloat({ min: 0 }).withMessage('Valid refund amount is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { reason, amount } = req.body;
    const payment = await Payment.findById(req.params.id);

    if (!payment) {
      return res.status(404).json({ message: 'Payment not found' });
    }

    // Check order access
    const order = await Order.findById(payment.order);
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    if (order.customer.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Access denied' });
    }

    if (payment.paymentStatus !== 'completed') {
      return res.status(400).json({ message: 'Payment must be completed to request refund' });
    }

    if (amount > payment.amount) {
      return res.status(400).json({ message: 'Refund amount cannot exceed payment amount' });
    }

    // TODO: Integrate with payment gateway for actual refund
    // For now, mark as refunded
    await payment.processRefund(amount, reason);

    res.json({
      message: 'Refund request submitted successfully',
      refund: {
        amount: amount,
        reason: reason,
        status: 'pending'
      }
    });
  } catch (error) {
    console.error('Request refund error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get payment statistics (Admin only)
router.get('/stats/admin', auth, roleAuth(['admin']), async (req, res) => {
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

    // Payment status counts
    const statusStats = await Payment.aggregate([
      { $match: dateFilter },
      {
        $group: {
          _id: '$paymentStatus',
          count: { $sum: 1 },
          totalAmount: { $sum: '$amount' }
        }
      }
    ]);

    // Payment method counts
    const methodStats = await Payment.aggregate([
      { $match: dateFilter },
      {
        $group: {
          _id: '$paymentMethod',
          count: { $sum: 1 },
          totalAmount: { $sum: '$amount' }
        }
      }
    ]);

    // Daily payment trends
    const dailyTrends = await Payment.aggregate([
      { $match: dateFilter },
      {
        $group: {
          _id: {
            $dateToString: { format: '%Y-%m-%d', date: '$createdAt' }
          },
          count: { $sum: 1 },
          totalAmount: { $sum: '$amount' }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    res.json({
      statusStats,
      methodStats,
      dailyTrends
    });
  } catch (error) {
    console.error('Get payment stats error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Helper function to simulate payment gateway
async function simulatePaymentGateway(method, details, amount) {
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  // Simulate success/failure (90% success rate)
  const isSuccess = Math.random() > 0.1;
  
  if (isSuccess) {
    return {
      success: true,
      orderId: 'ORD_' + Date.now(),
      paymentId: 'PAY_' + Date.now(),
      signature: 'SIG_' + Math.random().toString(36).substr(2, 9),
      message: 'Payment successful'
    };
  } else {
    return {
      success: false,
      error: 'Payment gateway temporarily unavailable'
    };
  }
}

module.exports = router;
