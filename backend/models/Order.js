const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
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
  farmer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  products: [{
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true
    },
    quantity: {
      type: Number,
      required: true,
      min: 1
    },
    price: {
      type: Number,
      required: true,
      min: 0
    },
    total: {
      type: Number,
      required: true,
      min: 0
    }
  }],
  orderStatus: {
    type: String,
    enum: ['pending', 'confirmed', 'preparing', 'ready_for_pickup', 'picked_up', 'in_transit', 'delivered', 'cancelled'],
    default: 'pending'
  },
  deliveryPartner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  deliveryPartnerStatus: {
    type: String,
    enum: ['pending', 'accepted', 'declined'],
    default: 'pending'
  },
  deliveryPartnerAssignedAt: Date,
  deliveryPartnerAcceptedAt: Date,
  deliveryAddress: {
    street: String,
    city: String,
    state: String,
    zipCode: String,
    coordinates: {
      latitude: Number,
      longitude: Number
    }
  },
  deliveryInstructions: String,
  totalAmount: {
    type: Number,
    required: true,
    min: 0
  },
  deliveryFee: {
    type: Number,
    default: 0,
    min: 0
  },
  taxAmount: {
    type: Number,
    default: 0,
    min: 0
  },
  finalAmount: {
    type: Number,
    required: true,
    min: 0
  },
  paymentStatus: {
    type: String,
    enum: ['pending', 'paid', 'failed', 'refunded'],
    default: 'pending'
  },
  paymentMethod: {
    type: String,
    enum: ['upi', 'card', 'net_banking', 'cod'],
    required: true
  },
  paymentId: String,
  estimatedDeliveryTime: Date,
  actualDeliveryTime: Date,
  customerRating: {
    type: Number,
    min: 1,
    max: 5
  },
  customerReview: String,
  // Order timeline
  statusHistory: [{
    status: String,
    timestamp: Date,
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    note: String
  }],
  // Cancellation details
  cancellationReason: String,
  cancelledBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  cancellationTime: Date
}, {
  timestamps: true
});

// Generate order number before saving
orderSchema.pre('save', function(next) {
  if (!this.orderNumber) {
    this.orderNumber = 'ORD' + Date.now() + Math.random().toString(36).substr(2, 5).toUpperCase();
  }
  next();
});

// Indexes for better performance
orderSchema.index({ orderNumber: 1 });
orderSchema.index({ customer: 1, orderStatus: 1 });
orderSchema.index({ farmer: 1, orderStatus: 1 });
orderSchema.index({ deliveryPartner: 1, orderStatus: 1 });
orderSchema.index({ orderStatus: 1, createdAt: 1 });
orderSchema.index({ paymentStatus: 1 });
orderSchema.index({ 'deliveryAddress.coordinates': '2dsphere' });

// Method to update order status
orderSchema.methods.updateStatus = function(newStatus, updatedBy, note = '') {
  this.orderStatus = newStatus;
  this.statusHistory.push({
    status: newStatus,
    timestamp: new Date(),
    updatedBy: updatedBy,
    note: note
  });
  return this.save();
};

// Method to calculate total amount
orderSchema.methods.calculateTotal = function() {
  const productsTotal = this.products.reduce((sum, item) => sum + item.total, 0);
  this.totalAmount = productsTotal;
  this.finalAmount = productsTotal + this.deliveryFee + this.taxAmount;
  return this.save();
};

module.exports = mongoose.model('Order', orderSchema);
