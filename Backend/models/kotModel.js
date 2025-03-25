// kotModel.js
const mongoose = require('mongoose');

const KOTSchema = new mongoose.Schema({
  restaurantId: {
    type: String,
    required: true,
    index: true
  },
  kotNumber: {
    type: Number,
    required: true
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
    category: {
      type: String,
      enum: ['Veg', 'Non-Veg']
    },
    variant: {
      name: String,
      price: Number
    }
  }],
  status: {
    type: String,
    enum: ['PENDING', 'COMPLETED', 'CANCELLED'],
    default: 'PENDING'
  },
  holdBillId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'HoldBill',
    required: true
  },
  kotDate: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

KOTSchema.index({ restaurantId: 1, kotNumber: 1 }, { unique: true });

module.exports = mongoose.model('KOT', KOTSchema);
