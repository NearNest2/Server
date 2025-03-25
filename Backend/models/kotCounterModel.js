const mongoose = require('mongoose');

const KOTCounterSchema = new mongoose.Schema({
  restaurantId: { 
    type: String, 
    required: true,
    unique: true
  },
  seq: { 
    type: Number, 
    default: 0 
  }
});

module.exports = mongoose.model('KOTCounter', KOTCounterSchema);