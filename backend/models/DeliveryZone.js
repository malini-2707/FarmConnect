const mongoose = require('mongoose');

const deliveryZoneSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true
  },
  description: String,
  // Zone boundaries (polygon coordinates)
  boundaries: [{
    latitude: Number,
    longitude: Number
  }],
  // Center point of the zone
  center: {
    latitude: Number,
    longitude: Number
  },
  // Zone radius in kilometers
  radius: {
    type: Number,
    required: true,
    min: 1,
    max: 50
  },
  // Delivery pricing
  baseDeliveryFee: {
    type: Number,
    required: true,
    min: 0
  },
  // Additional charges based on distance
  distancePricing: [{
    minDistance: Number, // in km
    maxDistance: Number, // in km
    additionalFee: Number
  }],
  // Zone status
  isActive: {
    type: Boolean,
    default: true
  },
  // Assigned delivery partners
  assignedPartners: [{
    partner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    assignedDate: Date,
    isActive: Boolean
  }],
  // Zone statistics
  statistics: {
    totalDeliveries: { type: Number, default: 0 },
    averageDeliveryTime: { type: Number, default: 0 }, // in minutes
    customerRating: { type: Number, default: 0 }
  },
  // Operating hours
  operatingHours: {
    startTime: String, // Format: "HH:MM"
    endTime: String,   // Format: "HH:MM"
    is24Hours: { type: Boolean, default: false }
  },
  // Special conditions
  specialConditions: [{
    type: String, // 'rainy_day', 'peak_hours', 'weekend'
    additionalFee: Number,
    description: String
  }]
}, {
  timestamps: true
});

// Indexes for better performance
deliveryZoneSchema.index({ name: 1 });
deliveryZoneSchema.index({ isActive: 1 });
deliveryZoneSchema.index({ 'center': '2dsphere' });
deliveryZoneSchema.index({ radius: 1 });

// Method to check if a location is within zone
deliveryZoneSchema.methods.isLocationInZone = function(latitude, longitude) {
  // Simple distance calculation (can be enhanced with proper polygon checking)
  const distance = this.calculateDistance(
    this.center.latitude,
    this.center.longitude,
    latitude,
    longitude
  );
  return distance <= this.radius;
};

// Method to calculate delivery fee for a location
deliveryZoneSchema.methods.calculateDeliveryFee = function(latitude, longitude, specialConditions = []) {
  const distance = this.calculateDistance(
    this.center.latitude,
    this.center.longitude,
    latitude,
    longitude
  );
  
  let fee = this.baseDeliveryFee;
  
  // Add distance-based charges
  for (const pricing of this.distancePricing) {
    if (distance >= pricing.minDistance && distance <= pricing.maxDistance) {
      fee += pricing.additionalFee;
      break;
    }
  }
  
  // Add special condition charges
  for (const condition of specialConditions) {
    const specialCondition = this.specialConditions.find(sc => sc.type === condition);
    if (specialCondition) {
      fee += specialCondition.additionalFee;
    }
  }
  
  return fee;
};

// Helper method to calculate distance between two points
deliveryZoneSchema.methods.calculateDistance = function(lat1, lon1, lat2, lon2) {
  const R = 6371; // Earth's radius in kilometers
  const dLat = this.deg2rad(lat2 - lat1);
  const dLon = this.deg2rad(lon2 - lon1);
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(this.deg2rad(lat1)) * Math.cos(this.deg2rad(lat2)) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
};

// Helper method to convert degrees to radians
deliveryZoneSchema.methods.deg2rad = function(deg) {
  return deg * (Math.PI/180);
};

module.exports = mongoose.model('DeliveryZone', deliveryZoneSchema);
