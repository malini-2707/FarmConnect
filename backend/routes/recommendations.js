const express = require('express');
const mongoose = require('mongoose');
const Order = require('../models/Order');
const auth = require('../middleware/auth');

const router = express.Router();

// GET /api/recommendations/trending?days=14&limit=20
router.get('/trending', async (req, res) => {
  try {
    const days = Number(req.query.days || 14);
    const limit = Number(req.query.limit || 20);
    const from = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const items = await Order.aggregate([
      { $match: { paymentStatus: 'paid', createdAt: { $gte: from } } },
      { $unwind: '$products' },
      { $group: { _id: '$products.product', score: { $sum: '$products.quantity' } } },
      { $sort: { score: -1 } },
      { $limit: limit },
      { $lookup: { from: 'products', localField: '_id', foreignField: '_id', as: 'product' } },
      { $unwind: '$product' },
      { $project: { _id: 0, product: 1, score: 1 } }
    ]);

    res.json(items);
  } catch (err) {
    console.error('Trending recommendations error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/recommendations/personalized
router.get('/personalized', auth, async (req, res) => {
  try {
    const userId = new mongoose.Types.ObjectId(req.user.id);
    const limit = Number(req.query.limit || 20);
    const days = Number(req.query.days || 30);
    const from = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const recent = await Order.aggregate([
      { $match: { paymentStatus: 'paid', customer: userId, createdAt: { $gte: from } } },
      { $unwind: '$products' },
      { $lookup: { from: 'products', localField: 'products.product', foreignField: '_id', as: 'p' } },
      { $unwind: '$p' },
      { $group: { _id: '$p.category', score: { $sum: '$products.quantity' } } },
      { $sort: { score: -1 } }
    ]);

    const preferredCategories = recent.map(r => r._id);

    // Primary: top products in preferred categories
    const primary = await Order.aggregate([
      { $match: { paymentStatus: 'paid', createdAt: { $gte: from } } },
      { $unwind: '$products' },
      { $lookup: { from: 'products', localField: 'products.product', foreignField: '_id', as: 'p' } },
      { $unwind: '$p' },
      { $match: preferredCategories.length ? { 'p.category': { $in: preferredCategories } } : {} },
      { $group: { _id: '$products.product', score: { $sum: '$products.quantity' } } },
      { $sort: { score: -1 } },
      { $limit: limit },
      { $lookup: { from: 'products', localField: '_id', foreignField: '_id', as: 'product' } },
      { $unwind: '$product' },
      { $project: { _id: 0, product: 1, score: 1 } }
    ]);

    if (primary.length >= limit) return res.json(primary);

    // Fallback: trending fill
    const remaining = limit - primary.length;
    const trending = await Order.aggregate([
      { $match: { paymentStatus: 'paid', createdAt: { $gte: from } } },
      { $unwind: '$products' },
      { $group: { _id: '$products.product', score: { $sum: '$products.quantity' } } },
      { $sort: { score: -1 } },
      { $limit: remaining },
      { $lookup: { from: 'products', localField: '_id', foreignField: '_id', as: 'product' } },
      { $unwind: '$product' },
      { $project: { _id: 0, product: 1, score: 1 } }
    ]);

    res.json([...primary, ...trending]);
  } catch (err) {
    console.error('Personalized recommendations error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;


