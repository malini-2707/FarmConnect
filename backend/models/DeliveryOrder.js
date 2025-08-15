const mongoose = require('mongoose');

const deliveryOrderSchema = new mongoose.Schema({
  orderNumber: {
    type: String,
    required: true,
    unique: true
  },
  customer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  warehouse: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Warehouse',
    required: true
  },
  deliveryPartner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'DeliveryPartner'
  },
  products: [{
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true
    },
    warehouseProduct: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'WarehouseProduct',
      required: true
    },
    quantity: {
      type: Number,
      required: true,
      min: 0
    },
    unit: {
      type: String,
      required: true
    },
    price: {
      type: Number,
      required: true
    }
  }],
  deliveryAddress: {
    street: String,
    city: String,
    state: String,
    zipCode: String,
    country: { type: String, default: 'India' },
    coordinates: {
      latitude: Number,
      longitude: Number
    }
  },
  deliveryDetails: {
    serviceType: {
      type: String,
      enum: ['same_day', 'next_day', 'express', 'standard', 'bulk'],
      required: true
    },
    preferredDate: {
      type: Date,
      required: true
    },
    preferredTimeSlot: {
      type: String,
      enum: ['morning', 'afternoon', 'evening', 'anytime'],
      default: 'anytime'
    },
    specialInstructions: String,
    requiresRefrigeration: {
      type: Boolean,
      default: true
    }
  },
  pricing: {
    subtotal: {
      type: Number,
      required: true,
      min: 0
    },
    deliveryFee: {
      type: Number,
      required: true,
      min: 0
    },
    taxes: {
      type: Number,
      default: 0
    },
    total: {
      type: Number,
      required: true,
      min: 0
    }
  },
  status: {
    type: String,
    enum: ['pending', 'confirmed', 'warehouse_processing', 'picked_up', 'in_transit', 'out_for_delivery', 'delivered', 'failed', 'cancelled'],
    default: 'pending'
  },
  tracking: {
    currentLocation: {
      type: String,
      default: 'Warehouse'
    },
    estimatedDelivery: Date,
    actualDelivery: Date,
    pickupTime: Date,
    transitStartTime: Date,
    lastUpdate: {
      type: Date,
      default: Date.now
    },
    updates: [{
      status: String,
      location: String,
      timestamp: {
        type: Date,
        default: Date.now
      },
      description: String,
      updatedBy: {
        type: String,
        enum: ['system', 'warehouse', 'delivery_partner', 'customer']
      }
    }]
  },
  payment: {
    method: {
      type: String,
      enum: ['cod', 'online', 'wallet', 'card'],
      required: true
    },
    status: {
      type: String,
      enum: ['pending', 'paid', 'failed', 'refunded'],
      default: 'pending'
    },
    transactionId: String,
    paidAt: Date
  },
  customerFeedback: {
    rating: {
      type: Number,
      min: 1,
      max: 5
    },
    comment: String,
    deliveryRating: {
      type: Number,
      min: 1,
      max: 5
    },
    deliveryComment: String,
    submittedAt: Date
  },
  warehouseNotes: String,
  deliveryPartnerNotes: String,
  isUrgent: {
    type: Boolean,
    default: false
  },
  priority: {
    type: String,
    enum: ['low', 'normal', 'high', 'urgent'],
    default: 'normal'
  }
}, {
  timestamps: true
});

// Indexes for efficient queries
deliveryOrderSchema.index({ orderNumber: 1 });
deliveryOrderSchema.index({ customer: 1 });
deliveryOrderSchema.index({ warehouse: 1 });
deliveryOrderSchema.index({ deliveryPartner: 1 });
deliveryOrderSchema.index({ status: 1 });
deliveryOrderSchema.index({ 'deliveryDetails.preferredDate': 1 });
deliveryOrderSchema.index({ 'tracking.estimatedDelivery': 1 });
deliveryOrderSchema.index({ createdAt: -1 });

// Pre-save middleware to generate order number
deliveryOrderSchema.pre('save', async function(next) {
  if (this.isNew) {
    const date = new Date();
    const year = date.getFullYear().toString().slice(-2);
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    
    // Get count of orders for today
    const todayStart = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const todayEnd = new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1);
    
    const count = await this.constructor.countDocuments({
      createdAt: { $gte: todayStart, $lt: todayEnd }
    });
    
    const sequence = (count + 1).toString().padStart(4, '0');
    this.orderNumber = `DO${year}${month}${day}${sequence}`;
  }
  next();
});

// Method to update delivery status
deliveryOrderSchema.methods.updateStatus = function(newStatus, location = '', description = '', updatedBy = 'system') {
  this.status = newStatus;
  this.tracking.currentLocation = location;
  this.tracking.lastUpdate = new Date();
  
  this.tracking.updates.push({
    status: newStatus,
    location,
    description,
    updatedBy
  });
  
  // Update specific timestamps based on status
  switch (newStatus) {
    case 'picked_up':
      this.tracking.pickupTime = new Date();
      break;
    case 'in_transit':
      this.tracking.transitStartTime = new Date();
      break;
    case 'delivered':
      this.tracking.actualDelivery = new Date();
      break;
  }
  
  return this.save();
};

// Method to calculate delivery fee
deliveryOrderSchema.methods.calculateDeliveryFee = function(distance, weight, serviceType) {
  if (!this.deliveryPartner) {
    return 0;
  }
  
  try {
    return this.deliveryPartner.calculateDeliveryCost(serviceType, distance, weight);
  } catch (error) {
    // Default calculation if partner method fails
    const baseFee = 50;
    const perKmFee = 2;
    const weightFee = weight > 10 ? (weight - 10) * 0.5 : 0;
    
    return baseFee + (distance * perKmFee) + weightFee;
  }
};

// Method to check if delivery is on time
deliveryOrderSchema.methods.isOnTime = function() {
  if (this.status !== 'delivered' || !this.tracking.actualDelivery || !this.tracking.estimatedDelivery) {
    return null;
  }
  
  const actual = new Date(this.tracking.actualDelivery);
  const estimated = new Date(this.tracking.estimatedDelivery);
  const timeDiff = actual.getTime() - estimated.getTime();
  
  // Consider on-time if delivered within 2 hours of estimated time
  return timeDiff <= 2 * 60 * 60 * 1000;
};

// Method to get delivery progress percentage
deliveryOrderSchema.methods.getProgressPercentage = function() {
  const statusOrder = [
    'pending', 'confirmed', 'warehouse_processing', 'picked_up', 
    'in_transit', 'out_for_delivery', 'delivered'
  ];
  
  const currentIndex = statusOrder.indexOf(this.status);
  if (currentIndex === -1) return 0;
  
  return Math.round((currentIndex / (statusOrder.length - 1)) * 100);
};

// Method to add customer feedback
deliveryOrderSchema.methods.addFeedback = function(rating, comment, deliveryRating, deliveryComment) {
  this.customerFeedback = {
    rating,
    comment,
    deliveryRating,
    deliveryComment,
    submittedAt: new Date()
  };
  
  return this.save();
};

// Static method to get orders by status
deliveryOrderSchema.statics.getByStatus = function(status) {
  return this.find({ status }).populate('customer warehouse deliveryPartner');
};

// Static method to get urgent orders
deliveryOrderSchema.statics.getUrgentOrders = function() {
  return this.find({
    $or: [
      { isUrgent: true },
      { priority: 'urgent' },
      { 'deliveryDetails.serviceType': 'same_day' }
    ],
    status: { $nin: ['delivered', 'cancelled', 'failed'] }
  }).populate('customer warehouse deliveryPartner');
};

// Static method to get orders expiring soon
deliveryOrderSchema.statics.getExpiringOrders = function(hours = 24) {
  const cutoffTime = new Date();
  cutoffTime.setHours(cutoffTime.getHours() + hours);
  
  return this.find({
    'tracking.estimatedDelivery': { $lte: cutoffTime },
    status: { $nin: ['delivered', 'cancelled', 'failed'] }
  }).populate('customer warehouse deliveryPartner');
};

module.exports = mongoose.model('DeliveryOrder', deliveryOrderSchema);
