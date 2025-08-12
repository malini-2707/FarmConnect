const mongoose = require('mongoose');

const requestSchema = new mongoose.Schema({
  buyer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  seller: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
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
  message: {
    type: String,
    trim: true
  },
  status: {
    type: String,
    enum: ['pending', 'accepted', 'rejected', 'completed', 'cancelled'],
    default: 'pending'
  },
  proposedPrice: {
    type: Number,
    min: 0
  },
  deliveryAddress: {
    street: String,
    city: String,
    state: String,
    zipCode: String
  },
  deliveryDate: {
    type: Date
  },
  totalAmount: {
    type: Number,
    min: 0
  }
}, {
  timestamps: true
});

// Index for efficient queries
requestSchema.index({ buyer: 1, status: 1 });
requestSchema.index({ seller: 1, status: 1 });
requestSchema.index({ product: 1 });

module.exports = mongoose.model('Request', requestSchema);
