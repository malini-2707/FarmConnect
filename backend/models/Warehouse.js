const mongoose = require('mongoose');

const warehouseSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  location: {
    address: {
      street: String,
      city: String,
      state: String,
      zipCode: String,
      country: { type: String, default: 'India' }
    },
    coordinates: {
      latitude: Number,
      longitude: Number
    }
  },
  capacity: {
    total: {
      type: Number,
      required: true,
      min: 0
    },
    available: {
      type: Number,
      required: true,
      min: 0
    },
    unit: {
      type: String,
      enum: ['kg', 'tons', 'cubic_meters'],
      default: 'kg'
    }
  },
  temperature: {
    current: {
      type: Number,
      required: true
    },
    min: {
      type: Number,
      required: true
    },
    max: {
      type: Number,
      required: true
    },
    unit: {
      type: String,
      default: 'celsius'
    }
  },
  humidity: {
    current: {
      type: Number,
      required: true
    },
    min: {
      type: Number,
      required: true
    },
    max: {
      type: Number,
      required: true
    },
    unit: {
      type: String,
      default: 'percentage'
    }
  },
  sections: [{
    name: {
      type: String,
      required: true
    },
    capacity: {
      type: Number,
      required: true
    },
    available: {
      type: Number,
      required: true
    },
    temperature: {
      type: Number,
      required: true
    },
    humidity: {
      type: Number,
      required: true
    },
    products: [{
      product: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Product'
      },
      quantity: {
        type: Number,
        required: true,
        min: 0
      },
      entryDate: {
        type: Date,
        default: Date.now
      },
      ripeningDate: {
        type: Date,
        required: true
      },
      status: {
        type: String,
        enum: ['stored', 'ripening', 'ready', 'expired'],
        default: 'stored'
      }
    }]
  }],
  isActive: {
    type: Boolean,
    default: true
  },
  manager: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  contactInfo: {
    phone: String,
    email: String,
    emergencyContact: String
  },
  maintenance: {
    lastCheck: {
      type: Date,
      default: Date.now
    },
    nextCheck: {
      type: Date,
      required: true
    },
    status: {
      type: String,
      enum: ['operational', 'maintenance', 'out_of_service'],
      default: 'operational'
    }
  }
}, {
  timestamps: true
});

// Indexes for efficient queries
warehouseSchema.index({ location: '2dsphere' });
warehouseSchema.index({ 'sections.products.status': 1 });
warehouseSchema.index({ 'sections.products.ripeningDate': 1 });
warehouseSchema.index({ isActive: 1 });

// Method to check if warehouse has available capacity
warehouseSchema.methods.hasAvailableCapacity = function(quantity) {
  return this.capacity.available >= quantity;
};

// Method to add product to warehouse
warehouseSchema.methods.addProduct = function(sectionName, productId, quantity, ripeningDays = 1) {
  const section = this.sections.find(s => s.name === sectionName);
  if (!section) {
    throw new Error('Section not found');
  }
  
  if (section.available < quantity) {
    throw new Error('Insufficient capacity in section');
  }
  
  const ripeningDate = new Date();
  ripeningDate.setDate(ripeningDate.getDate() + ripeningDays);
  
  section.products.push({
    product: productId,
    quantity: quantity,
    entryDate: new Date(),
    ripeningDate: ripeningDate,
    status: 'stored'
  });
  
  section.available -= quantity;
  this.capacity.available -= quantity;
  
  return this.save();
};

// Method to remove product from warehouse
warehouseSchema.methods.removeProduct = function(sectionName, productId, quantity) {
  const section = this.sections.find(s => s.name === sectionName);
  if (!section) {
    throw new Error('Section not found');
  }
  
  const productIndex = section.products.findIndex(p => p.product.toString() === productId.toString());
  if (productIndex === -1) {
    throw new Error('Product not found in section');
  }
  
  const product = section.products[productIndex];
  if (product.quantity < quantity) {
    throw new Error('Insufficient quantity in warehouse');
  }
  
  if (product.quantity === quantity) {
    section.products.splice(productIndex, 1);
  } else {
    product.quantity -= quantity;
  }
  
  section.available += quantity;
  this.capacity.available += quantity;
  
  return this.save();
};

// Method to update product status based on ripening
warehouseSchema.methods.updateProductStatus = function() {
  const now = new Date();
  
  this.sections.forEach(section => {
    section.products.forEach(product => {
      if (product.status === 'stored' && now >= product.ripeningDate) {
        product.status = 'ready';
      } else if (product.status === 'ready') {
        // Check if product is expired (7 days after ripening)
        const expiryDate = new Date(product.ripeningDate);
        expiryDate.setDate(expiryDate.getDate() + 7);
        if (now >= expiryDate) {
          product.status = 'expired';
        }
      }
    });
  });
  
  return this.save();
};

module.exports = mongoose.model('Warehouse', warehouseSchema);
