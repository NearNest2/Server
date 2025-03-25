// billModel.js
const mongoose = require('mongoose');

const BillSchema = new mongoose.Schema({
  billNumber: {
    type: Number,
    required: true
  },
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
    quantity: { type: Number, default: 1 },
    price: Number,
    category: { type: String, enum: ['Veg', 'Non-Veg'] },
    variant: {
      name: String,
      price: Number
    },
    names: String
  }],
  status: {
    type: String,
    enum: ['ACTIVE', 'COMPLETED', 'CANCELLED'],
    default: 'ACTIVE'
  },
  totalAmount: {
    type: Number,
    required: true
  },
  paymentStatus: {
    type: String,
    enum: ['PENDING', 'PAID', 'PARTIALLY_PAID'],
    default: 'PENDING'
  },
  paymentMethod: {
    type: String,
    enum: ['CASH', 'CARD', 'UPI', 'OTHER'],
    default: 'CASH'
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
  names: String,
  printCount: {
    type: Number,
    default: 0
  }
}, { timestamps: true });

BillSchema.index({ restaurantId: 1, status: 1 });
BillSchema.index({ restaurantId: 1, createdAt: -1 });
BillSchema.index({ tableId: 1, status: 1 });
BillSchema.index({ restaurantId: 1, tableNumber: 1 });
BillSchema.index({ restaurantId: 1, billNumber: 1 }, { unique: true });

module.exports = mongoose.model('Bill', BillSchema);