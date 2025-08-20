const express = require('express');
const Product = require('../models/Product');

const router = express.Router();

// GET /api/search/products?q=&limit=&category=
router.get('/products', async (req, res) => {
  try {
    const { q = '', limit = 20, category } = req.query;
    const query = {};
    if (q) {
      query.$text = { $search: q };
    }
    if (category) {
      query.category = category;
    }
    query.isAvailable = true;

    const projection = q ? { score: { $meta: 'textScore' } } : {};
    const sort = q ? { score: { $meta: 'textScore' } } : { createdAt: -1 };

    const products = await Product.find(query, projection)
      .sort(sort)
      .limit(Number(limit));

    res.json(products);
  } catch (err) {
    console.error('Search products error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;


