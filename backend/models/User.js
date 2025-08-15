const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true
  },
  password: {
    type: String,
    required: true,
    minlength: 6
  },
  role: {
    type: String,
    enum: ['customer', 'farmer', 'delivery_partner', 'admin'],
    required: true
  },
  phone: {
    type: String,
    required: true
  },
  address: {
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
  profileImage: {
    type: String,
    default: ''
  },
  isVerified: {
    type: Boolean,
    default: false
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
  // Farmer-specific fields
  farmDetails: {
    farmName: String,
    farmType: String,
    verificationDocuments: [String],
    isVerified: { type: Boolean, default: false },
    farmAddress: {
      street: String,
      city: String,
      state: String,
      zipCode: String,
      coordinates: {
        latitude: Number,
        longitude: Number
      }
    }
  },
  // Delivery Partner-specific fields
  deliveryDetails: {
    vehicleType: String,
    vehicleNumber: String,
    licenseNumber: String,
    isAvailable: { type: Boolean, default: true },
    currentLocation: {
      latitude: Number,
      longitude: Number
    },
    isOnline: { type: Boolean, default: false }
  },
  // Common fields
  preferences: {
    notifications: {
      email: { type: Boolean, default: true },
      sms: { type: Boolean, default: true },
      push: { type: Boolean, default: true }
    },
    language: { type: String, default: 'en' }
  }
}, {
  timestamps: true
});

// Hash password before saving
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Compare password method
userSchema.methods.comparePassword = async function(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

// Indexes for better performance
userSchema.index({ email: 1 });
userSchema.index({ role: 1 });
userSchema.index({ 'address.coordinates': '2dsphere' });
userSchema.index({ 'farmDetails.farmAddress.coordinates': '2dsphere' });
userSchema.index({ 'deliveryDetails.currentLocation': '2dsphere' });

module.exports = mongoose.model('User', userSchema);
