const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const admin = require('../middleware/admin');
const Warehouse = require('../models/Warehouse');
const WarehouseProduct = require('../models/WarehouseProduct');
const Product = require('../models/Product');

// Middleware to check if user is admin or warehouse manager
const warehouseAccess = async (req, res, next) => {
  try {
    const role = req.userDoc?.role || req.user?.role;
    if (role === 'admin') {
      return next();
    }
    
    const warehouse = await Warehouse.findById(req.params.id);
    if (!warehouse) {
      return res.status(404).json({ message: 'Warehouse not found' });
    }
    
    const currentUserId = (req.userDoc?._id && req.userDoc._id.toString()) || req.user?.userId || req.user?._id || req.user?.id;
    if (!currentUserId || warehouse.manager.toString() !== currentUserId.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }
    
    next();
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

// @route   GET /api/warehouse
// @desc    Get all warehouses (admin only)
// @access  Admin
router.get('/', auth, admin, async (req, res) => {
  try {
    const warehouses = await Warehouse.find()
      .populate('manager', 'name email phone')
      .select('-sections.products');
    
    res.json(warehouses);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/warehouse/:id
// @desc    Get warehouse by ID
// @access  Admin or warehouse manager
router.get('/:id', auth, warehouseAccess, async (req, res) => {
  try {
    const warehouse = await Warehouse.findById(req.params.id)
      .populate('manager', 'name email phone')
      .populate('sections.products.product', 'name description images category');
    
    if (!warehouse) {
      return res.status(404).json({ message: 'Warehouse not found' });
    }
    
    res.json(warehouse);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   POST /api/warehouse
// @desc    Create new warehouse (admin only)
// @access  Admin
router.post('/', auth, admin, async (req, res) => {
  try {
    const {
      name,
      location,
      capacity,
      temperature,
      humidity,
      sections,
      manager,
      contactInfo
    } = req.body;

    // Validate required fields
    if (!name || !location || !capacity || !temperature || !humidity || !manager) {
      return res.status(400).json({ message: 'Please provide all required fields' });
    }

    // Set next maintenance check (30 days from now)
    const nextCheck = new Date();
    nextCheck.setDate(nextCheck.getDate() + 30);

    const warehouse = new Warehouse({
      name,
      location,
      capacity,
      temperature,
      humidity,
      sections: sections || [],
      manager,
      contactInfo,
      maintenance: {
        nextCheck
      }
    });

    await warehouse.save();
    
    const populatedWarehouse = await Warehouse.findById(warehouse._id)
      .populate('manager', 'name email phone');
    
    res.status(201).json(populatedWarehouse);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   PUT /api/warehouse/:id
// @desc    Update warehouse (admin or warehouse manager)
// @access  Admin or warehouse manager
router.put('/:id', auth, warehouseAccess, async (req, res) => {
  try {
    const warehouse = await Warehouse.findById(req.params.id);
    if (!warehouse) {
      return res.status(404).json({ message: 'Warehouse not found' });
    }

    const updatedWarehouse = await Warehouse.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    ).populate('manager', 'name email phone');

    res.json(updatedWarehouse);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   DELETE /api/warehouse/:id
// @desc    Delete warehouse (admin only)
// @access  Admin
router.delete('/:id', auth, admin, async (req, res) => {
  try {
    const warehouse = await Warehouse.findById(req.params.id);
    if (!warehouse) {
      return res.status(404).json({ message: 'Warehouse not found' });
    }

    // Check if warehouse has products
    const hasProducts = await WarehouseProduct.findOne({ warehouse: req.params.id });
    if (hasProducts) {
      return res.status(400).json({ message: 'Cannot delete warehouse with products' });
    }

    await warehouse.remove();
    res.json({ message: 'Warehouse deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   POST /api/warehouse/:id/sections
// @desc    Add new section to warehouse
// @access  Admin or warehouse manager
router.post('/:id/sections', auth, warehouseAccess, async (req, res) => {
  try {
    const { name, capacity, temperature, humidity } = req.body;
    
    if (!name || !capacity || !temperature || !humidity) {
      return res.status(400).json({ message: 'Please provide all required fields' });
    }

    const warehouse = await Warehouse.findById(req.params.id);
    if (!warehouse) {
      return res.status(404).json({ message: 'Warehouse not found' });
    }

    // Check if section name already exists
    const sectionExists = warehouse.sections.find(s => s.name === name);
    if (sectionExists) {
      return res.status(400).json({ message: 'Section name already exists' });
    }

    warehouse.sections.push({
      name,
      capacity,
      available: capacity,
      temperature,
      humidity,
      products: []
    });

    await warehouse.save();
    res.json(warehouse);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   PUT /api/warehouse/:id/sections/:sectionId
// @desc    Update warehouse section
// @access  Admin or warehouse manager
router.put('/:id/sections/:sectionId', auth, warehouseAccess, async (req, res) => {
  try {
    const warehouse = await Warehouse.findById(req.params.id);
    if (!warehouse) {
      return res.status(404).json({ message: 'Warehouse not found' });
    }

    const section = warehouse.sections.id(req.params.sectionId);
    if (!section) {
      return res.status(404).json({ message: 'Section not found' });
    }

    Object.assign(section, req.body);
    await warehouse.save();
    
    res.json(warehouse);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   DELETE /api/warehouse/:id/sections/:sectionId
// @desc    Delete warehouse section
// @access  Admin or warehouse manager
router.delete('/:id/sections/:sectionId', auth, warehouseAccess, async (req, res) => {
  try {
    const warehouse = await Warehouse.findById(req.params.id);
    if (!warehouse) {
      return res.status(404).json({ message: 'Warehouse not found' });
    }

    const section = warehouse.sections.id(req.params.sectionId);
    if (!section) {
      return res.status(404).json({ message: 'Section not found' });
    }

    if (section.products.length > 0) {
      return res.status(400).json({ message: 'Cannot delete section with products' });
    }

    section.remove();
    await warehouse.save();
    
    res.json({ message: 'Section deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   POST /api/warehouse/:id/products
// @desc    Add product to warehouse
// @access  Admin or warehouse manager
router.post('/:id/products', auth, warehouseAccess, async (req, res) => {
  try {
    const {
      sectionName,
      productId,
      quantity,
      ripeningDays,
      temperature,
      humidity,
      quality,
      notes,
      isOrganic,
      harvestDate,
      batchNumber
    } = req.body;

    if (!sectionName || !productId || !quantity || !temperature || !humidity || !batchNumber) {
      return res.status(400).json({ message: 'Please provide all required fields' });
    }

    const warehouse = await Warehouse.findById(req.params.id);
    if (!warehouse) {
      return res.status(404).json({ message: 'Warehouse not found' });
    }

    const section = warehouse.sections.find(s => s.name === sectionName);
    if (!section) {
      return res.status(404).json({ message: 'Section not found' });
    }

    if (section.available < quantity) {
      return res.status(400).json({ message: 'Insufficient capacity in section' });
    }

    // Create warehouse product entry
    const currentUserId = (req.userDoc?._id && req.userDoc._id.toString()) || req.user?.userId || req.user?._id || req.user?.id;
    const warehouseProduct = new WarehouseProduct({
      warehouse: warehouse._id,
      section: sectionName,
      product: productId,
      farmer: currentUserId,
      quantity,
      unit: 'kg', // Default unit, can be updated
      ripeningDays: ripeningDays || 1,
      temperature,
      humidity,
      quality: quality || 'good',
      notes,
      isOrganic: isOrganic || false,
      harvestDate: harvestDate || new Date(),
      batchNumber
    });

    await warehouseProduct.save();

    // Update warehouse section
    section.products.push({
      product: productId,
      quantity,
      entryDate: new Date(),
      ripeningDate: warehouseProduct.ripeningDate,
      status: 'stored'
    });

    section.available -= quantity;
    warehouse.capacity.available -= quantity;

    await warehouse.save();

    const populatedProduct = await WarehouseProduct.findById(warehouseProduct._id)
      .populate('product', 'name description images category')
      .populate('warehouse', 'name location');

    res.status(201).json(populatedProduct);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/warehouse/:id/products
// @desc    Get all products in warehouse
// @access  Admin or warehouse manager
router.get('/:id/products', auth, warehouseAccess, async (req, res) => {
  try {
    const { status, section, farmer } = req.query;
    
    let query = { warehouse: req.params.id };
    
    if (status) query.status = status;
    if (section) query.section = section;
    if (farmer) query.farmer = farmer;

    const products = await WarehouseProduct.find(query)
      .populate('product', 'name description images category')
      .populate('farmer', 'name email phone')
      .sort({ entryDate: -1 });

    res.json(products);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   PUT /api/warehouse/:id/products/:productId
// @desc    Update warehouse product
// @access  Admin or warehouse manager
router.put('/:id/products/:productId', auth, warehouseAccess, async (req, res) => {
  try {
    const warehouseProduct = await WarehouseProduct.findById(req.params.productId);
    if (!warehouseProduct) {
      return res.status(404).json({ message: 'Product not found' });
    }

    if (warehouseProduct.warehouse.toString() !== req.params.id) {
      return res.status(400).json({ message: 'Product does not belong to this warehouse' });
    }

    Object.assign(warehouseProduct, req.body);
    await warehouseProduct.save();

    const updatedProduct = await WarehouseProduct.findById(req.params.productId)
      .populate('product', 'name description images category')
      .populate('farmer', 'name email phone');

    res.json(updatedProduct);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   DELETE /api/warehouse/:id/products/:productId
// @desc    Remove product from warehouse
// @access  Admin or warehouse manager
router.delete('/:id/products/:productId', auth, warehouseAccess, async (req, res) => {
  try {
    const warehouseProduct = await WarehouseProduct.findById(req.params.productId);
    if (!warehouseProduct) {
      return res.status(404).json({ message: 'Product not found' });
    }

    if (warehouseProduct.warehouse.toString() !== req.params.id) {
      return res.status(400).json({ message: 'Product does not belong to this warehouse' });
    }

    // Update warehouse section
    const warehouse = await Warehouse.findById(req.params.id);
    const section = warehouse.sections.find(s => s.name === warehouseProduct.section);
    
    if (section) {
      const productIndex = section.products.findIndex(p => p.product.toString() === warehouseProduct.product.toString());
      if (productIndex !== -1) {
        section.available += warehouseProduct.quantity;
        warehouse.capacity.available += warehouseProduct.quantity;
        section.products.splice(productIndex, 1);
        await warehouse.save();
      }
    }

    await warehouseProduct.remove();
    res.json({ message: 'Product removed from warehouse successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/warehouse/:id/status
// @desc    Get warehouse status and metrics
// @access  Admin or warehouse manager
router.get('/:id/status', auth, warehouseAccess, async (req, res) => {
  try {
    const warehouse = await Warehouse.findById(req.params.id);
    if (!warehouse) {
      return res.status(404).json({ message: 'Warehouse not found' });
    }

    // Get product counts by status
    const statusCounts = await WarehouseProduct.aggregate([
      { $match: { warehouse: warehouse._id } },
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]);

    // Get products expiring soon
    const expiringSoon = await WarehouseProduct.getExpiringSoon(2);

    // Get available products for sale
    const availableForSale = await WarehouseProduct.getAvailableForSale();

    const status = {
      warehouse: {
        name: warehouse.name,
        capacity: warehouse.capacity,
        temperature: warehouse.temperature,
        humidity: warehouse.humidity,
        maintenance: warehouse.maintenance
      },
      products: {
        total: await WarehouseProduct.countDocuments({ warehouse: warehouse._id }),
        byStatus: statusCounts,
        expiringSoon: expiringSoon.length,
        availableForSale: availableForSale.length
      },
      sections: warehouse.sections.map(section => ({
        name: section.name,
        capacity: section.capacity,
        available: section.available,
        utilization: ((section.capacity - section.available) / section.capacity * 100).toFixed(2)
      }))
    };

    res.json(status);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   POST /api/warehouse/:id/maintenance
// @desc    Update warehouse maintenance status
// @access  Admin or warehouse manager
router.post('/:id/maintenance', auth, warehouseAccess, async (req, res) => {
  try {
    const { status, nextCheck, notes } = req.body;
    
    const warehouse = await Warehouse.findById(req.params.id);
    if (!warehouse) {
      return res.status(404).json({ message: 'Warehouse not found' });
    }

    warehouse.maintenance = {
      lastCheck: new Date(),
      nextCheck: nextCheck || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
      status: status || 'operational'
    };

    await warehouse.save();
    res.json(warehouse);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
