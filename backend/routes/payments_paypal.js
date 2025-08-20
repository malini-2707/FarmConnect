const express = require('express');
const { body, validationResult } = require('express-validator');
const auth = require('../middleware/auth');
const roleAuth = require('../middleware/roleAuth');
const Order = require('../models/Order');
const Payment = require('../models/Payment');

const router = express.Router();

function getPayPalClient() {
  const paypal = require('@paypal/checkout-server-sdk');
  const environment = process.env.NODE_ENV === 'production'
    ? new paypal.core.LiveEnvironment(process.env.PAYPAL_CLIENT_ID, process.env.PAYPAL_CLIENT_SECRET)
    : new paypal.core.SandboxEnvironment(process.env.PAYPAL_CLIENT_ID, process.env.PAYPAL_CLIENT_SECRET);
  return new paypal.core.PayPalHttpClient(environment);
}

// POST /api/payments/paypal/create-order
router.post('/create-order', [auth, roleAuth(['customer']), body('orderId').isMongoId()], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  try {
    const order = await Order.findById(req.body.orderId);
    if (!order) return res.status(404).json({ message: 'Order not found' });
    if (order.customer.toString() !== req.user.id) return res.status(403).json({ message: 'Access denied' });

    const client = getPayPalClient();
    const currency = process.env.CURRENCY || 'USD';
    const request = new (require('@paypal/checkout-server-sdk').orders.OrdersCreateRequest)();
    request.headers['Prefer'] = 'return=representation';
    request.requestBody({
      intent: 'CAPTURE',
      purchase_units: [{
        amount: { currency_code: currency, value: order.finalAmount.toFixed(2) },
        custom_id: order._id.toString()
      }]
    });
    const response = await client.execute(request);

    let payment = await Payment.findOne({ order: order._id });
    if (!payment) {
      payment = new Payment({
        order: order._id,
        amount: order.finalAmount,
        currency,
        paymentMethod: 'card',
        paymentStatus: 'processing',
        gateway: { name: 'paypal', orderId: response.result.id }
      });
      await payment.save();
    }

    res.json({ id: response.result.id, links: response.result.links });
  } catch (err) {
    console.error('PayPal create-order error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// POST /api/payments/paypal/capture/:orderId
router.post('/capture/:orderId', [auth, roleAuth(['customer'])], async (req, res) => {
  try {
    const client = getPayPalClient();
    const request = new (require('@paypal/checkout-server-sdk').orders.OrdersCaptureRequest)(req.params.orderId);
    request.requestBody({});
    const capture = await client.execute(request);

    const paymentDoc = await Payment.findOne({ 'gateway.orderId': req.params.orderId });
    if (paymentDoc) {
      paymentDoc.paymentStatus = 'completed';
      paymentDoc.gateway.paymentId = capture.result.purchase_units?.[0]?.payments?.captures?.[0]?.id;
      paymentDoc.gatewayResponse = capture.result;
      await paymentDoc.save();
      const orderId = capture.result.purchase_units?.[0]?.custom_id;
      if (orderId) {
        const order = await Order.findById(orderId);
        if (order) {
          order.paymentStatus = 'paid';
          await order.save();
        }
      }
    }

    res.json(capture.result);
  } catch (err) {
    console.error('PayPal capture error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;


