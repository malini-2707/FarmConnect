const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    required: true
  },
  category: {
    type: String,
    required: true,
    enum: ['vegetables', 'fruits', 'grains', 'dairy', 'herbs', 'organic', 'other']
  },
  price: {
    type: Number,
    required: true,
    min: 0
  },
  unit: {
    type: String,
    required: true,
    enum: ['kg', 'gram', 'liter', 'piece', 'dozen', 'bunch']
  },
  quantity: {
    type: Number,
    required: true,
    min: 0
  },
  images: [{
    type: String
  }],
  seller: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  location: {
    city: String,
    state: String,
    coordinates: {
      latitude: Number,
      longitude: Number
    }
  },
  isOrganic: {
    type: Boolean,
    default: false
  },
  harvestDate: {
    type: Date
  },
  expiryDate: {
    type: Date
  },
  isAvailable: {
    type: Boolean,
    default: true
  },
  rating: {
    type: Number,
    default: 0,
    min: 0,
    max: 5
  },
  totalRatings: {
    type: Number,
    default: 0
  },
  tags: [String],
  // Enhanced inventory management
  minOrderQuantity: {
    type: Number,
    default: 1,
    min: 1
  },
  maxOrderQuantity: {
    type: Number,
    default: 100,
    min: 1
  },
  bulkPricing: [{
    minQuantity: Number,
    pricePerUnit: Number
  }],
  // Stock management
  lowStockThreshold: {
    type: Number,
    default: 10
  },
  // Product verification
  isVerified: {
    type: Boolean,
    default: false
  },
  verificationDate: Date,
  verifiedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

// Index for search functionality
productSchema.index({ name: 'text', description: 'text', tags: 'text' });
productSchema.index({ category: 1, isAvailable: 1 });
productSchema.index({ seller: 1 });
productSchema.index({ 'location.coordinates': '2dsphere' });
productSchema.index({ isVerified: 1, isAvailable: 1 });
productSchema.index({ expiryDate: 1 });

// Virtual for checking if product is low stock
productSchema.virtual('isLowStock').get(function() {
  return this.quantity <= this.lowStockThreshold;
});

// Method to update stock
productSchema.methods.updateStock = function(quantity) {
  this.quantity = Math.max(0, this.quantity + quantity);
  this.isAvailable = this.quantity > 0;
  return this.save();
};

module.exports = mongoose.model('Product', productSchema);
