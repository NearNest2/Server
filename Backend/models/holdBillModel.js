// holdBillModel.js
const mongoose = require('mongoose');

const HoldBillSchema = new mongoose.Schema({
  restaurantId: {
    type: String,
    required: true,
    index: true
  },
  tableId: {
    type: String,
    required: true
  },
  tableNumber: {
    type: Number,
    required: true
  },
  items: [{
    productId: mongoose.Schema.Types.ObjectId,
    itemName: String,
    quantity: {
      type: Number,
      default: 1
    },
    price: Number,
    pricingType: {
      type: String,
      enum: ['basePrice', 'mrp'],
      required: true
    },
    category: {
      type: String,
      enum: ['Veg', 'Non-Veg']
    },
    variant: {
      name: String,
      price: Number
    },
    names: String
  }],
  status: {
    type: String,
    enum: ['HOLD', 'RESUMED', 'CANCELLED'],
    default: 'HOLD'
  },
  subtotal: {
    type: Number,
    required: true
  },
  cgst: {
    type: Number,
    required: true
  },
  sgst: {
    type: Number,
    required: true
  },
  discountPercentage: {
    type: Number,
    default: 0,
    min: 0,
    max: 100
  },
  discountAmount: {
    type: Number,
    default: 0
  },
  totalAmount: {
    type: Number,
    required: true
  },
    paymentMode: {
    type: String,
    enum: ['Cash', 'UPI', 'Card', 'Other'],
    default: 'Cash',
    required: true
  },
  names: String
}, {
  timestamps: true
});

module.exports = mongoose.model('HoldBill', HoldBillSchema);