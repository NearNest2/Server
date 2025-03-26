const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  restaurantId: {
    type: String,
    unique: true,
    required: true
  },
  email: {
    type: String,
    required: true
  },
  password: {
    type: String,
    required: true
  },
  restaurantName: {
    type: String,
    required: true
  },
  outletName: {
    type: String,
    required: true
  },
  location: {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point'
    },
    coordinates: {
      type: [Number], 
      required: true
    }
  },
  address: {
    type: String,
    required: true
  },
  contactNumber: {
    type: String
  },
  isVerified: {
    type: Boolean,
    default: false
  },
  otp: {
    code: String,
    expiresAt: Date
  }
}, 
{ timestamps: true });

// Create a geospatial index
userSchema.index({ location: '2dsphere' });

module.exports = mongoose.model('User', userSchema);
