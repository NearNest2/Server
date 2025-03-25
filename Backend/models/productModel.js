const mongoose = require('mongoose');

const VariantSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  price: {
    type: Number,
    required: true
  }
});

const ProductSchema = new mongoose.Schema({
  restaurantId: {
    type: String,
    required: true,
    index: true
  },
  category: {
    type: String,
    required: true,
    enum: ['Veg', 'Non-Veg']
  },
  itemName: {
    type: String,
    required: true,
    trim: true
  },
  pricingType: {
    type: String,
    required: true,
    enum: ['basePrice', 'mrp'],
    default: 'basePrice'
  },
  basePrice: {
    type: Number,
    required: function() {
      return this.pricingType === 'basePrice';
    }
  },
  mrp: {
    type: Number,
    required: function() {
      return this.pricingType === 'mrp';
    }
  },
  sellingPrice: {
    type: Number,
    required: function() {
      return this.pricingType === 'mrp';
    },
    validate: {
      validator: function(value) {
        if (this.pricingType === 'mrp') {
          return value <= this.mrp;
        }
        return true;
      },
      message: 'Selling price cannot be greater than MRP'
    }
  },
  type: {
    type: String,
    required: true,
    enum: [
      'Beverage', 
      'Starter', 
      'Dessert', 
      'Breads',
      'Main-Course', 
      'Combo', 
      'Sweets', 
      'Snacks', 
      'Custom'
    ]
  },
  unitType: {
    type: String,
    required: true,
    enum: ['Size', 'Quantity', 'Weight', 'Custom']
  },
  variants: [VariantSchema],
  imageUrl: {
    type: String
  },
  inStock: {
    type: Boolean,
    default: true
  },
  outOfStockUntil: {
    type: Date,
    default: null
  }
}, { timestamps: true });

ProductSchema.index({ restaurantId: 1, createdAt: -1 });

module.exports = mongoose.model('Product', ProductSchema);

