const mongoose = require('mongoose');

const warehouseProductSchema = new mongoose.Schema({
  warehouse: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Warehouse',
    required: true
  },
  section: {
    type: String,
    required: true
  },
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true
  },
  farmer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  quantity: {
    type: Number,
    required: true,
    min: 0
  },
  unit: {
    type: String,
    enum: ['kg', 'gram', 'liter', 'piece', 'dozen', 'bunch'],
    required: true
  },
  entryDate: {
    type: Date,
    default: Date.now
  },
  ripeningDays: {
    type: Number,
    required: true,
    min: 1,
    default: 1
  },
  ripeningDate: {
    type: Date,
    required: true
  },
  status: {
    type: String,
    enum: ['stored', 'ripening', 'ready', 'reserved', 'shipped', 'expired'],
    default: 'stored'
  },
  quality: {
    type: String,
    enum: ['excellent', 'good', 'average', 'poor'],
    default: 'good'
  },
  temperature: {
    type: Number,
    required: true
  },
  humidity: {
    type: Number,
    required: true
  },
  notes: {
    type: String,
    trim: true
  },
  expiryDate: {
    type: Date,
    required: true
  },
  lastChecked: {
    type: Date,
    default: Date.now
  },
  isOrganic: {
    type: Boolean,
    default: false
  },
  harvestDate: {
    type: Date
  },
  batchNumber: {
    type: String,
    required: true
  }
}, {
  timestamps: true
});

// Indexes for efficient queries
warehouseProductSchema.index({ warehouse: 1, section: 1 });
warehouseProductSchema.index({ product: 1 });
warehouseProductSchema.index({ status: 1 });
warehouseProductSchema.index({ ripeningDate: 1 });
warehouseProductSchema.index({ expiryDate: 1 });
warehouseProductSchema.index({ farmer: 1 });

// Pre-save middleware to calculate ripening and expiry dates
warehouseProductSchema.pre('save', function(next) {
  if (this.isNew || this.isModified('entryDate') || this.isModified('ripeningDays')) {
    // Calculate ripening date
    this.ripeningDate = new Date(this.entryDate);
    this.ripeningDate.setDate(this.ripeningDate.getDate() + this.ripeningDays);
    
    // Calculate expiry date (7 days after ripening)
    this.expiryDate = new Date(this.ripeningDate);
    this.expiryDate.setDate(this.expiryDate.getDate() + 7);
  }
  next();
});

// Method to check if product is ready for sale
warehouseProductSchema.methods.isReadyForSale = function() {
  const now = new Date();
  return this.status === 'ready' && now >= this.ripeningDate && now <= this.expiryDate;
};

// Method to update status based on current date
warehouseProductSchema.methods.updateStatus = function() {
  const now = new Date();
  
  if (this.status === 'stored' && now >= this.ripeningDate) {
    this.status = 'ready';
  } else if (this.status === 'ready' && now > this.expiryDate) {
    this.status = 'expired';
  }
  
  this.lastChecked = now;
  return this.save();
};

// Method to reserve product for order
warehouseProductSchema.methods.reserveForOrder = function(quantity) {
  if (this.quantity < quantity) {
    throw new Error('Insufficient quantity available');
  }
  
  if (this.status !== 'ready') {
    throw new Error('Product not ready for sale');
  }
  
  this.quantity -= quantity;
  this.status = this.quantity > 0 ? 'ready' : 'reserved';
  
  return this.save();
};

// Method to mark as shipped
warehouseProductSchema.methods.markAsShipped = function() {
  this.status = 'shipped';
  return this.save();
};

// Static method to get available products for sale
warehouseProductSchema.statics.getAvailableForSale = function() {
  const now = new Date();
  return this.find({
    status: 'ready',
    ripeningDate: { $lte: now },
    expiryDate: { $gt: now },
    quantity: { $gt: 0 }
  }).populate('product warehouse');
};

// Static method to get products expiring soon
warehouseProductSchema.statics.getExpiringSoon = function(days = 2) {
  const now = new Date();
  const expiringDate = new Date();
  expiringDate.setDate(expiringDate.getDate() + days);
  
  return this.find({
    status: 'ready',
    expiryDate: { $gte: now, $lte: expiringDate }
  }).populate('product warehouse');
};

module.exports = mongoose.model('WarehouseProduct', warehouseProductSchema);
