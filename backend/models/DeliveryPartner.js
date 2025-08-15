const mongoose = require('mongoose');

const deliveryPartnerSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  companyType: {
    type: String,
    enum: ['logistics', 'courier', 'transport', 'warehouse_delivery'],
    required: true
  },
  contactInfo: {
    primaryContact: {
      name: String,
      phone: String,
      email: String
    },
    address: {
      street: String,
      city: String,
      state: String,
      zipCode: String,
      country: { type: String, default: 'India' }
    },
    phone: String,
    email: String,
    website: String
  },
  services: [{
    type: {
      type: String,
      enum: ['same_day', 'next_day', 'express', 'standard', 'bulk'],
      required: true
    },
    description: String,
    basePrice: {
      type: Number,
      required: true,
      min: 0
    },
    perKmPrice: {
      type: Number,
      required: true,
      min: 0
    },
    maxWeight: Number,
    maxDistance: Number,
    isActive: {
      type: Boolean,
      default: true
    }
  }],
  coverage: {
    cities: [String],
    states: [String],
    radius: {
      type: Number,
      default: 100 // km
    }
  },
  vehicles: [{
    type: {
      type: String,
      enum: ['bike', 'car', 'van', 'truck', 'refrigerated_truck'],
      required: true
    },
    capacity: {
      weight: Number,
      volume: Number,
      unit: {
        type: String,
        default: 'kg'
      }
    },
    count: {
      type: Number,
      default: 1
    },
    isRefrigerated: {
      type: Boolean,
      default: false
    }
  }],
  warehouseConnections: [{
    warehouse: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Warehouse',
      required: true
    },
    distance: Number, // km
    estimatedTime: Number, // minutes
    isActive: {
      type: Boolean,
      default: true
    }
  }],
  rating: {
    average: {
      type: Number,
      default: 0,
      min: 0,
      max: 5
    },
    totalRatings: {
      type: Number,
      default: 0
    },
    reviews: [{
      user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      },
      rating: {
        type: Number,
        required: true,
        min: 1,
        max: 5
      },
      comment: String,
      date: {
        type: Date,
        default: Date.now
      }
    }]
  },
  performance: {
    totalDeliveries: {
      type: Number,
      default: 0
    },
    successfulDeliveries: {
      type: Number,
      default: 0
    },
    averageDeliveryTime: {
      type: Number,
      default: 0 // minutes
    },
    onTimeDeliveryRate: {
      type: Number,
      default: 0,
      min: 0,
      max: 100
    }
  },
  documents: {
    businessLicense: String,
    insurance: String,
    vehiclePermits: [String],
    certifications: [String]
  },
  isVerified: {
    type: Boolean,
    default: false
  },
  isActive: {
    type: Boolean,
    default: true
  },
  workingHours: {
    start: {
      type: String,
      default: '09:00'
    },
    end: {
      type: String,
      default: '18:00'
    },
    days: [{
      type: String,
      enum: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'],
      default: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday']
    }]
  },
  specializations: [{
    type: String,
    enum: ['fruits', 'vegetables', 'dairy', 'meat', 'frozen', 'organic', 'bulk']
  }]
}, {
  timestamps: true
});

// Indexes for efficient queries
deliveryPartnerSchema.index({ name: 1 });
deliveryPartnerSchema.index({ 'coverage.cities': 1 });
deliveryPartnerSchema.index({ 'coverage.states': 1 });
deliveryPartnerSchema.index({ isActive: 1, isVerified: 1 });
deliveryPartnerSchema.index({ 'services.type': 1 });
deliveryPartnerSchema.index({ 'vehicles.type': 1 });

// Method to calculate delivery cost
deliveryPartnerSchema.methods.calculateDeliveryCost = function(serviceType, distance, weight = 0) {
  const service = this.services.find(s => s.type === serviceType && s.isActive);
  if (!service) {
    throw new Error('Service not available');
  }
  
  let cost = service.basePrice;
  cost += distance * service.perKmPrice;
  
  // Add weight-based charges if applicable
  if (weight > 0 && service.maxWeight) {
    const weightFactor = Math.ceil(weight / service.maxWeight);
    cost *= weightFactor;
  }
  
  return cost;
};

// Method to check if partner can deliver to location
deliveryPartnerSchema.methods.canDeliverTo = function(city, state) {
  return (
    this.coverage.cities.includes(city) ||
    this.coverage.states.includes(state) ||
    this.isActive
  );
};

// Method to get available vehicles for delivery
deliveryPartnerSchema.methods.getAvailableVehicles = function(weight, volume, requiresRefrigeration = false) {
  return this.vehicles.filter(vehicle => {
    if (requiresRefrigeration && !vehicle.isRefrigerated) return false;
    if (weight && vehicle.capacity.weight && weight > vehicle.capacity.weight) return false;
    if (volume && vehicle.capacity.volume && volume > vehicle.capacity.volume) return false;
    return true;
  });
};

// Method to update performance metrics
deliveryPartnerSchema.methods.updatePerformance = function(deliveryTime, isSuccessful) {
  this.performance.totalDeliveries += 1;
  if (isSuccessful) {
    this.performance.successfulDeliveries += 1;
  }
  
  // Update average delivery time
  const totalTime = this.performance.averageDeliveryTime * (this.performance.totalDeliveries - 1) + deliveryTime;
  this.performance.averageDeliveryTime = totalTime / this.performance.totalDeliveries;
  
  // Calculate on-time delivery rate (assuming delivery time < 2 hours is on-time)
  const onTimeDeliveries = this.performance.successfulDeliveries;
  this.performance.onTimeDeliveryRate = (onTimeDeliveries / this.performance.totalDeliveries) * 100;
  
  return this.save();
};

// Method to add review
deliveryPartnerSchema.methods.addReview = function(userId, rating, comment) {
  this.rating.reviews.push({
    user: userId,
    rating,
    comment
  });
  
  // Recalculate average rating
  const totalRating = this.rating.reviews.reduce((sum, review) => sum + review.rating, 0);
  this.rating.average = totalRating / this.rating.reviews.length;
  this.rating.totalRatings = this.rating.reviews.length;
  
  return this.save();
};

// Static method to find partners by location and service
deliveryPartnerSchema.statics.findByLocationAndService = function(city, state, serviceType, weight = 0) {
  return this.find({
    isActive: true,
    isVerified: true,
    $or: [
      { 'coverage.cities': city },
      { 'coverage.states': state }
    ],
    'services.type': serviceType,
    'services.isActive': true
  }).populate('warehouseConnections.warehouse', 'name location');
};

module.exports = mongoose.model('DeliveryPartner', deliveryPartnerSchema);
