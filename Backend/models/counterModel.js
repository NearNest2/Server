// counterModel.js
const mongoose = require('mongoose');

const CounterSchema = new mongoose.Schema({
  restaurantId: {
    type: String,
    required: true
  },
  name: {
    type: String,
    required: true
  },
  seq: {
    type: Number,
    default: 0
  }
});

CounterSchema.index({ restaurantId: 1, name: 1 }, { unique: true });

const Counter = mongoose.model('Counter', CounterSchema);

module.exports = Counter;