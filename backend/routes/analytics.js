const express = require('express');
const mongoose = require('mongoose');
const Order = require('../models/Order');
const auth = require('../middleware/auth');
const roleAuth = require('../middleware/roleAuth');

const router = express.Router();

router.get('/admin/overview', auth, roleAuth(['admin']), async (req, res) => {
  try {
    const { from, to } = req.query;
    const matchStage = { paymentStatus: 'paid' };
    if (from || to) {
      matchStage.createdAt = {};
      if (from) matchStage.createdAt.$gte = new Date(from);
      if (to) matchStage.createdAt.$lte = new Date(to);
    }

    const [summary] = await Order.aggregate([
      { $match: matchStage },
      {
        $facet: {
          salesByDay: [
            {
              $group: {
                _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
                orders: { $sum: 1 },
                revenue: { $sum: '$finalAmount' }
              }
            },
            { $sort: { _id: 1 } }
          ],
          topProducts: [
            { $unwind: '$products' },
            {
              $group: {
                _id: '$products.product',
                qty: { $sum: '$products.quantity' },
                revenue: { $sum: '$products.total' }
              }
            },
            { $sort: { revenue: -1 } },
            { $limit: 10 },
            {
              $lookup: {
                from: 'products',
                localField: '_id',
                foreignField: '_id',
                as: 'product'
              }
            },
            { $unwind: '$product' },
            {
              $project: {
                _id: 1,
                qty: 1,
                revenue: 1,
                name: '$product.name',
                category: '$product.category'
              }
            }
          ],
          topCategories: [
            { $unwind: '$products' },
            {
              $lookup: {
                from: 'products',
                localField: 'products.product',
                foreignField: '_id',
                as: 'p'
              }
            },
            { $unwind: '$p' },
            {
              $group: {
                _id: '$p.category',
                qty: { $sum: '$products.quantity' },
                revenue: { $sum: '$products.total' }
              }
            },
            { $sort: { revenue: -1 } }
          ]
        }
      }
    ]);

    res.json(summary || { salesByDay: [], topProducts: [], topCategories: [] });
  } catch (err) {
    console.error('Analytics admin overview error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

router.get('/farmer/:farmerId', auth, roleAuth(['farmer', 'admin']), async (req, res) => {
  try {
    const { farmerId } = req.params;
    const { from, to } = req.query;
    const matchStage = { paymentStatus: 'paid', farmer: new mongoose.Types.ObjectId(farmerId) };
    if (from || to) {
      matchStage.createdAt = {};
      if (from) matchStage.createdAt.$gte = new Date(from);
      if (to) matchStage.createdAt.$lte = new Date(to);
    }

    const [summary] = await Order.aggregate([
      { $match: matchStage },
      {
        $facet: {
          earningsByDay: [
            {
              $group: {
                _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
                orders: { $sum: 1 },
                revenue: { $sum: '$finalAmount' }
              }
            },
            { $sort: { _id: 1 } }
          ],
          bestProducts: [
            { $unwind: '$products' },
            {
              $group: {
                _id: '$products.product',
                qty: { $sum: '$products.quantity' },
                revenue: { $sum: '$products.total' }
              }
            },
            { $sort: { revenue: -1 } },
            { $limit: 10 },
            {
              $lookup: {
                from: 'products',
                localField: '_id',
                foreignField: '_id',
                as: 'product'
              }
            },
            { $unwind: '$product' },
            { $project: { _id: 1, qty: 1, revenue: 1, name: '$product.name', category: '$product.category' } }
          ],
          totals: [
            {
              $group: {
                _id: null,
                orders: { $sum: 1 },
                revenue: { $sum: '$finalAmount' }
              }
            }
          ]
        }
      }
    ]);

    res.json(summary || { earningsByDay: [], bestProducts: [], totals: [] });
  } catch (err) {
    console.error('Analytics farmer error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;


