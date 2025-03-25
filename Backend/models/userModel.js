// userModel.js - revised
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
  isVerified: {
    type: Boolean,
    default: false
  },
  otp: {
    code: String,
    expiresAt: Date
  },
  resetPasswordToken: String,
  resetPasswordExpires: Date
}, 
{ timestamps: true });

userSchema.index({ email: 1, restaurantId: 1 }, { unique: true });

userSchema.index({ email: 1, outletName: 1 }, { unique: true });

module.exports = mongoose.model('User', userSchema);
