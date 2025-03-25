const mongoose = require('mongoose');
const { Schema } = mongoose;

const supportSchema = new Schema({
  restaurantId: {
    type: String,
    required: true,
    index: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    trim: true,
    lowercase: true 
  },
  subject: {
    type: String,
    required: true,
    trim: true
  },
  message: {
    type: String,
    required: true,
    trim: true
  },
  status: {
    type: String,
    enum: ['pending', 'resolved', 'in-progress', 'closed'],
    default: 'pending'
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

supportSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

supportSchema.index({ restaurantId: 1, createdAt: -1 });

const Support = mongoose.model('Support', supportSchema);
module.exports = Support;