const express = require('express');
const { body, validationResult } = require('express-validator');
const crypto = require('crypto');
const auth = require('../middleware/auth');
const roleAuth = require('../middleware/roleAuth');
const Order = require('../models/Order');
const Payment = require('../models/Payment');

const router = express.Router();

// POST /api/payments/razorpay/create-order
router.post('/create-order', [auth, roleAuth(['customer']), body('orderId').isMongoId()], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  try {
    const instance = new (require('razorpay'))({
      key_id: process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET
    });

    const order = await Order.findById(req.body.orderId);
    if (!order) return res.status(404).json({ message: 'Order not found' });
    if (order.customer.toString() !== req.user.id) return res.status(403).json({ message: 'Access denied' });

    const rzpOrder = await instance.orders.create({
      amount: Math.round(order.finalAmount * 100),
      currency: process.env.CURRENCY || 'INR',
      notes: { orderId: order._id.toString() }
    });

    let payment = await Payment.findOne({ order: order._id });
    if (!payment) {
      payment = new Payment({
        order: order._id,
        amount: order.finalAmount,
        currency: (process.env.CURRENCY || 'INR'),
        paymentMethod: 'upi',
        paymentStatus: 'processing',
        gateway: { name: 'razorpay', orderId: rzpOrder.id }
      });
      await payment.save();
    }

    res.json({ orderId: rzpOrder.id, amount: rzpOrder.amount, currency: rzpOrder.currency, key: process.env.RAZORPAY_KEY_ID });
  } catch (err) {
    console.error('Razorpay create order error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// POST /api/payments/razorpay/webhook
router.post('/webhook', express.json({ type: 'application/json' }), async (req, res) => {
  try {
    const signature = req.headers['x-razorpay-signature'];
    const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
    const body = JSON.stringify(req.body);
    const expected = crypto.createHmac('sha256', secret).update(body).digest('hex');
    if (expected !== signature) return res.status(400).send('Invalid signature');

    const event = req.body;
    if (event.event === 'payment.captured') {
      const rOrderId = event.payload.payment.entity.order_id;
      const paymentDoc = await Payment.findOne({ 'gateway.orderId': rOrderId });
      if (paymentDoc) {
        paymentDoc.paymentStatus = 'completed';
        paymentDoc.gateway.paymentId = event.payload.payment.entity.id;
        paymentDoc.gatewayResponse = event;
        await paymentDoc.save();
        const orderId = event.payload.payment.entity.notes?.orderId;
        if (orderId) {
          const order = await Order.findById(orderId);
          if (order) {
            order.paymentStatus = 'paid';
            await order.save();
          }
        }
      }
    }
    res.json({ received: true });
  } catch (err) {
    console.error('Razorpay webhook error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;


