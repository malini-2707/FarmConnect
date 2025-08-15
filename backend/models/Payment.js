const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
  order: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Order',
    required: true
  },
  amount: {
    type: Number,
    required: true,
    min: 0
  },
  currency: {
    type: String,
    default: 'INR'
  },
  paymentMethod: {
    type: String,
    enum: ['upi', 'card', 'net_banking', 'cod'],
    required: true
  },
  paymentStatus: {
    type: String,
    enum: ['pending', 'processing', 'completed', 'failed', 'refunded', 'cancelled'],
    default: 'pending'
  },
  transactionId: {
    type: String,
    unique: true
  },
  gatewayResponse: {
    type: mongoose.Schema.Types.Mixed
  },
  // Payment details
  paymentDetails: {
    upiId: String,
    cardNumber: String,
    bankName: String,
    accountNumber: String
  },
  // Refund information
  refundAmount: {
    type: Number,
    default: 0,
    min: 0
  },
  refundReason: String,
  refundDate: Date,
  refundTransactionId: String,
  // Payment timeline
  paymentHistory: [{
    status: String,
    timestamp: Date,
    amount: Number,
    note: String
  }],
  // Gateway specific fields
  gateway: {
    name: String, // 'razorpay', 'stripe', etc.
    orderId: String,
    paymentId: String,
    signature: String
  },
  // Customer details
  customerDetails: {
    name: String,
    email: String,
    phone: String
  },
  // Additional charges
  processingFee: {
    type: Number,
    default: 0
  },
  taxAmount: {
    type: Number,
    default: 0
  },
  totalAmount: {
    type: Number,
    required: true
  }
}, {
  timestamps: true
});

// Generate transaction ID before saving
paymentSchema.pre('save', function(next) {
  if (!this.transactionId) {
    this.transactionId = 'TXN' + Date.now() + Math.random().toString(36).substr(2, 5).toUpperCase();
  }
  next();
});

// Indexes for better performance
paymentSchema.index({ order: 1 });
paymentSchema.index({ transactionId: 1 });
paymentSchema.index({ paymentStatus: 1, createdAt: 1 });
paymentSchema.index({ gateway: 1, gatewayOrderId: 1 });

// Method to update payment status
paymentSchema.methods.updateStatus = function(newStatus, note = '') {
  this.paymentStatus = newStatus;
  this.paymentHistory.push({
    status: newStatus,
    timestamp: new Date(),
    amount: this.amount,
    note: note
  });
  return this.save();
};

// Method to process refund
paymentSchema.methods.processRefund = function(amount, reason) {
  this.refundAmount = amount;
  this.refundReason = reason;
  this.refundDate = new Date();
  this.paymentStatus = 'refunded';
  this.paymentHistory.push({
    status: 'refunded',
    timestamp: new Date(),
    amount: amount,
    note: `Refund processed: ${reason}`
  });
  return this.save();
};

// Method to calculate total amount
paymentSchema.methods.calculateTotal = function() {
  this.totalAmount = this.amount + this.processingFee + this.taxAmount;
  return this.save();
};

module.exports = mongoose.model('Payment', paymentSchema);
