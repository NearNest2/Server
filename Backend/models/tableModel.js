const mongoose = require('mongoose');
const { Schema } = mongoose;

const tableSchema = new Schema({
  restaurantId: {
    type: String,
    required: true,
    index: true
  },
  tableNumber: { 
    type: Number, 
    required: true 
  },
  status: { 
    type: String, 
    enum: ['Available', 'Occupied'], 
    default: 'Available' 
  },
  createdAt: { 
    type: Date, 
    default: Date.now 
  },
  updatedAt: { 
    type: Date, 
    default: Date.now 
  }
});

tableSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

tableSchema.index({ restaurantId: 1, tableNumber: 1 });

const Table = mongoose.model('Table', tableSchema);

module.exports = Table;