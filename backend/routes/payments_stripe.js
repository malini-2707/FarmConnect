const express = require('express');
const { body, validationResult } = require('express-validator');
const auth = require('../middleware/auth');
const roleAuth = require('../middleware/roleAuth');
const Order = require('../models/Order');
const Payment = require('../models/Payment');

const router = express.Router();

// POST /api/payments/stripe/create-intent
router.post('/create-intent', [
  auth,
  roleAuth(['customer']),
  body('orderId').isMongoId()
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  try {
    const { orderId } = req.body;
    const order = await Order.findById(orderId);
    if (!order) return res.status(404).json({ message: 'Order not found' });
    if (order.customer.toString() !== req.user.id) return res.status(403).json({ message: 'Access denied' });
    if (order.paymentStatus === 'paid') return res.status(400).json({ message: 'Order already paid' });

    const stripe = require('stripe')(process.env.STRIPE_SECRET);
    const currency = (process.env.CURRENCY || 'inr').toLowerCase();
    const amountInMinor = Math.round(order.finalAmount * 100);

    const intent = await stripe.paymentIntents.create({
      amount: amountInMinor,
      currency,
      metadata: { orderId: order._id.toString() }
    });

    // Ensure payment record exists
    let payment = await Payment.findOne({ order: order._id });
    if (!payment) {
      payment = new Payment({
        order: order._id,
        amount: order.finalAmount,
        currency: currency.toUpperCase(),
        paymentMethod: 'card',
        paymentStatus: 'processing',
        gateway: { name: 'stripe', orderId: intent.id }
      });
      await payment.save();
    }

    res.json({ clientSecret: intent.client_secret });
  } catch (err) {
    console.error('Stripe create-intent error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
// Stripe webhook endpoint (mounted with express.raw in server.js)
router.post('/webhook', async (req, res) => {
  try {
    const stripe = require('stripe')(process.env.STRIPE_SECRET);
    const signature = req.headers['stripe-signature'];
    const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

    let event;
    try {
      event = stripe.webhooks.constructEvent(req.body, signature, endpointSecret);
    } catch (err) {
      console.error('Stripe webhook signature error:', err.message);
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    if (event.type === 'payment_intent.succeeded') {
      const intent = event.data.object;
      const orderId = intent.metadata?.orderId;
      if (orderId) {
        const order = await Order.findById(orderId);
        if (order) {
          order.paymentStatus = 'paid';
          await order.save();
        }
        const payment = await Payment.findOne({ 'gateway.orderId': intent.id });
        if (payment) {
          payment.paymentStatus = 'completed';
          payment.gateway = { ...(payment.gateway || {}), paymentId: intent.id };
          payment.gatewayResponse = intent;
          await payment.save();
        }
      }
    }

    res.json({ received: true });
  } catch (err) {
    console.error('Stripe webhook error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});


