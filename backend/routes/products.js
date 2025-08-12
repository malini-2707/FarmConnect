const express = require('express');
const multer = require('multer');
const path = require('path');
const { body, validationResult } = require('express-validator');
const Product = require('../models/Product');
const auth = require('../middleware/auth');

const router = express.Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'D:/FarmConnect/images/');
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + '-' + Math.round(Math.random() * 1E9) + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  }
});

// Get all products with filtering and pagination
router.get('/', async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 12, 
      category, 
      search, 
      minPrice, 
      maxPrice, 
      isOrganic, 
      city,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    const query = { isAvailable: true };

    // Apply filters
    if (category && category !== 'all') {
      query.category = category;
    }
    
    if (search) {
      query.$text = { $search: search };
    }
    
    if (minPrice || maxPrice) {
      query.price = {};
      if (minPrice) query.price.$gte = parseFloat(minPrice);
      if (maxPrice) query.price.$lte = parseFloat(maxPrice);
    }
    
    if (isOrganic === 'true') {
      query.isOrganic = true;
    }
    
    if (city) {
      query['location.city'] = new RegExp(city, 'i');
    }

    // Sort options
    const sortOptions = {};
    sortOptions[sortBy] = sortOrder === 'desc' ? -1 : 1;

    const products = await Product.find(query)
      .populate('seller', 'name rating totalRatings location')
      .sort(sortOptions)
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .exec();

    const total = await Product.countDocuments(query);

    res.json({
      products,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total
    });
  } catch (error) {
    console.error('Get products error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get single product
router.get('/:id', async (req, res) => {
  try {
    const product = await Product.findById(req.params.id)
      .populate('seller', 'name email phone rating totalRatings location profileImage');
    
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    res.json(product);
  } catch (error) {
    console.error('Get product error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Create product (sellers only)
router.post('/', auth, upload.array('images', 5), [
  body('name').trim().isLength({ min: 2 }).withMessage('Product name must be at least 2 characters'),
  body('description').trim().isLength({ min: 10 }).withMessage('Description must be at least 10 characters'),
  body('category').isIn(['vegetables', 'fruits', 'grains', 'dairy', 'herbs', 'organic', 'other']).withMessage('Invalid category'),
  body('price').isFloat({ min: 0 }).withMessage('Price must be a positive number'),
  body('unit').isIn(['kg', 'gram', 'liter', 'piece', 'dozen', 'bunch']).withMessage('Invalid unit'),
  body('quantity').isFloat({ min: 0 }).withMessage('Quantity must be a positive number')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    if (req.user.role !== 'seller') {
      return res.status(403).json({ message: 'Only sellers can create products' });
    }

    const {
      name,
      description,
      category,
      price,
      unit,
      quantity,
      location,
      isOrganic,
      harvestDate,
      expiryDate,
      tags
    } = req.body;

    // Handle uploaded images
    const uploadedImages = req.files ? req.files.map(file => file.filename) : [];
    
    // Handle URL images
    const urlImages = req.body.imageUrls ? JSON.parse(req.body.imageUrls) : [];
    
    // Combine both types of images
    const images = [...uploadedImages, ...urlImages];

    const product = new Product({
      name,
      description,
      category,
      price: parseFloat(price),
      unit,
      quantity: parseFloat(quantity),
      images,
      seller: req.user.userId,
      location: location ? JSON.parse(location) : undefined,
      isOrganic: isOrganic === 'true',
      harvestDate: harvestDate ? new Date(harvestDate) : undefined,
      expiryDate: expiryDate ? new Date(expiryDate) : undefined,
      tags: tags ? JSON.parse(tags) : []
    });

    await product.save();
    await product.populate('seller', 'name rating totalRatings location');

    res.status(201).json({
      message: 'Product created successfully',
      product
    });
  } catch (error) {
    console.error('Create product error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update product (seller only)
router.put('/:id', auth, upload.array('images', 5), async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    if (product.seller.toString() !== req.user.userId) {
      return res.status(403).json({ message: 'Not authorized to update this product' });
    }

    // Update fields
    const updateFields = ['name', 'description', 'category', 'price', 'unit', 'quantity', 'isOrganic', 'harvestDate', 'expiryDate', 'isAvailable'];
    updateFields.forEach(field => {
      if (req.body[field] !== undefined) {
        product[field] = req.body[field];
      }
    });

    if (req.body.location) {
      product.location = JSON.parse(req.body.location);
    }

    if (req.body.tags) {
      product.tags = JSON.parse(req.body.tags);
    }

    // Handle new images
    if (req.files && req.files.length > 0) {
      const newImages = req.files.map(file => file.filename);
      product.images = [...product.images, ...newImages];
    }

    await product.save();
    await product.populate('seller', 'name rating totalRatings location');

    res.json({
      message: 'Product updated successfully',
      product
    });
  } catch (error) {
    console.error('Update product error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete product (seller only)
router.delete('/:id', auth, async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    if (product.seller.toString() !== req.user.userId) {
      return res.status(403).json({ message: 'Not authorized to delete this product' });
    }

    await Product.findByIdAndDelete(req.params.id);

    res.json({ message: 'Product deleted successfully' });
  } catch (error) {
    console.error('Delete product error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get current user's products (seller)
router.get('/seller/me', auth, async (req, res) => {
  try {
    const { page = 1, limit = 12 } = req.query;
    
    const products = await Product.find({ 
      seller: req.user.userId,
      isAvailable: true 
    })
      .populate('seller', 'name rating totalRatings location')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .exec();

    const total = await Product.countDocuments({ 
      seller: req.user.userId,
      isAvailable: true 
    });

    res.json({
      products,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total
    });
  } catch (error) {
    console.error('Get seller products error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get seller's products by ID
router.get('/seller/:sellerId', async (req, res) => {
  try {
    const { page = 1, limit = 12 } = req.query;
    
    const products = await Product.find({ 
      seller: req.params.sellerId,
      isAvailable: true 
    })
      .populate('seller', 'name rating totalRatings location')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .exec();

    const total = await Product.countDocuments({ 
      seller: req.params.sellerId,
      isAvailable: true 
    });

    res.json({
      products,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total
    });
  } catch (error) {
    console.error('Get seller products error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
