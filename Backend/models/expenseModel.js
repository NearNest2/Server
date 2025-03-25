const mongoose = require('mongoose');
const { Schema } = mongoose;

// Expense item schema
const expenseItemSchema = new Schema({
  item: { type: String, required: true },
  quantity: { type: Number },
  price: { type: Number }, 
  totalPrice: { type: Number, required: true }, 
  modeOfPayment: { type: String, default: 'None' },
  status: { type: String, enum: ['Paid', 'Unpaid'], default: 'Unpaid' },
});

const dailyExpenseSchema = new Schema({
  restaurantId: {
    type: String,
    required: true,
    index: true
  },
  date: { type: Date, required: true },
  expenses: [expenseItemSchema],
  totalDailyExpense: {
    type: Number,
    default: 0,
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

dailyExpenseSchema.pre('save', function(next) {
  this.totalDailyExpense = this.expenses.reduce((sum, expense) => sum + expense.totalPrice, 0);
  this.updatedAt = new Date();
  next();
});

dailyExpenseSchema.index({ restaurantId: 1, date: 1 });

const DailyExpense = mongoose.model('DailyExpense', dailyExpenseSchema);

module.exports = DailyExpense;