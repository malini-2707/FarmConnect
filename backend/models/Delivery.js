const mongoose = require('mongoose');

const deliverySchema = new mongoose.Schema({
  order: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Order',
    required: true
  },
  deliveryPartner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  pickupLocation: {
    coordinates: {
      latitude: Number,
      longitude: Number
    },
    address: String,
    city: String,
    state: String
  },
  deliveryLocation: {
    coordinates: {
      latitude: Number,
      longitude: Number
    },
    address: String,
    city: String,
    state: String
  },
  status: {
    type: String,
    enum: ['assigned', 'accepted', 'picked_up', 'in_transit', 'delivered', 'cancelled'],
    default: 'assigned'
  },
  pickupTime: Date,
  deliveryTime: Date,
  estimatedDuration: Number, // in minutes
  actualDuration: Number, // in minutes
  route: [{
    latitude: Number,
    longitude: Number,
    timestamp: Date,
    speed: Number
  }],
  // Delivery partner details
  vehicleDetails: {
    type: String,
    number: String
  },
  // Customer communication
  customerContact: {
    name: String,
    phone: String
  },
  // Delivery instructions
  specialInstructions: String,
  // Status updates
  statusUpdates: [{
    status: String,
    timestamp: Date,
    location: {
      latitude: Number,
      longitude: Number
    },
    note: String
  }],
  // Delivery confirmation
  deliveryConfirmation: {
    customerSignature: String,
    customerPhoto: String,
    deliveredAt: Date,
    customerNote: String
  },
  // Performance metrics
  performance: {
    onTimeDelivery: Boolean,
    customerRating: Number,
    deliveryTime: Number // actual vs estimated
  }
}, {
  timestamps: true
});

// Indexes for better performance
deliverySchema.index({ order: 1 });
deliverySchema.index({ deliveryPartner: 1, status: 1 });
deliverySchema.index({ status: 1, createdAt: 1 });
deliverySchema.index({ 'pickupLocation.coordinates': '2dsphere' });
deliverySchema.index({ 'deliveryLocation.coordinates': '2dsphere' });

// Method to update delivery status
deliverySchema.methods.updateStatus = function(newStatus, location = null, note = '') {
  this.status = newStatus;
  this.statusUpdates.push({
    status: newStatus,
    timestamp: new Date(),
    location: location,
    note: note
  });
  
  // Update timestamps for specific statuses
  if (newStatus === 'picked_up') {
    this.pickupTime = new Date();
  } else if (newStatus === 'delivered') {
    this.deliveryTime = new Date();
    if (this.pickupTime) {
      this.actualDuration = Math.round((this.deliveryTime - this.pickupTime) / (1000 * 60));
    }
  }
  
  return this.save();
};

// Method to add route point
deliverySchema.methods.addRoutePoint = function(latitude, longitude, speed = 0) {
  this.route.push({
    latitude,
    longitude,
    timestamp: new Date(),
    speed
  });
  return this.save();
};

// Method to calculate delivery performance
deliverySchema.methods.calculatePerformance = function() {
  if (this.estimatedDuration && this.actualDuration) {
    this.performance.onTimeDelivery = this.actualDuration <= this.estimatedDuration;
    this.performance.deliveryTime = this.actualDuration;
  }
  return this.save();
};

module.exports = mongoose.model('Delivery', deliverySchema);
