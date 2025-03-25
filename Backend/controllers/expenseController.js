const DailyExpense = require('../models/expenseModel');

const expenseController = {
  async getExpenses(req, res) {
    try {
      const { startDate, endDate, minAmount, maxAmount } = req.query;
      let query = { restaurantId: req.user.restaurantId };

      if (startDate && endDate) {
        query.date = {
          $gte: new Date(startDate),
          $lte: new Date(endDate),
        };
      }

      if (minAmount || maxAmount) {
        query.totalDailyExpense = {};
        if (minAmount) query.totalDailyExpense.$gte = parseFloat(minAmount);
        if (maxAmount) query.totalDailyExpense.$lte = parseFloat(maxAmount);
      }

      const expenses = await DailyExpense.find(query)
        .sort({ date: -1 })
        .limit(100);

      const flattenedExpenses = expenses.flatMap((dailyExpense) =>
        dailyExpense.expenses.map((expense) => ({
          ...expense.toObject(),
          _id: expense._id,
          date: dailyExpense.date,
        }))
      );

      res.json(flattenedExpenses);
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  },

  // Create a new expense
  async createExpense(req, res) {
    try {
      const { item, quantity, price, totalPrice, modeOfPayment } = req.body;
  
      if (!item || !totalPrice) {
        return res.status(400).json({ message: 'Item and total price are required' });
      }
  
      const today = new Date();
      today.setHours(0, 0, 0, 0);
  
      let dailyExpense = await DailyExpense.findOne({
        restaurantId: req.user.restaurantId,
        date: {
          $gte: today,
          $lt: new Date(today.getTime() + 24 * 60 * 60 * 1000),
        },
      });
  
      if (!dailyExpense) {
        dailyExpense = new DailyExpense({
          restaurantId: req.user.restaurantId,
          date: today,
          expenses: [],
        });
      }
  
      const newExpenseItem = {
        item,
        quantity: quantity || null,
        price: price || null,
        totalPrice,
        modeOfPayment: modeOfPayment || 'None',
        status: modeOfPayment === 'None' ? 'Unpaid' : 'Paid',
      };
  
      dailyExpense.expenses.push(newExpenseItem);
      await dailyExpense.save();
  
      const addedExpense = dailyExpense.expenses[dailyExpense.expenses.length - 1];
  
      res.status(201).json({
        ...addedExpense.toObject(),
        date: dailyExpense.date,
      });
    } catch (err) {
      res.status(400).json({ message: err.message });
    }
  },

  // Update an expense
  async updateExpense(req, res) {
    try {
      const dailyExpense = await DailyExpense.findOne({
        restaurantId: req.user.restaurantId,
        'expenses._id': req.params.expenseId,
      });

      if (!dailyExpense) {
        return res.status(404).json({ message: 'Expense not found' });
      }

      const expenseItem = dailyExpense.expenses.id(req.params.expenseId);

      Object.keys(req.body).forEach((key) => {
        if (key !== '_id' && key !== 'date') {
          expenseItem[key] = req.body[key];
        }
      });

      if (req.body.modeOfPayment) {
        expenseItem.status = req.body.modeOfPayment === 'None' ? 'Unpaid' : 'Paid';
      }

      await dailyExpense.save();

      res.json({
        ...expenseItem.toObject(),
        date: dailyExpense.date,
      });
    } catch (err) {
      res.status(400).json({ message: err.message });
    }
  },

  // Get statistics for all expenses
  async getExpenseStats(req, res) {
    try {
      const stats = await DailyExpense.aggregate([
        { $match: { restaurantId: req.user.restaurantId } },
        { $unwind: '$expenses' },
        {
          $group: {
            _id: null,
            totalExpenses: { $sum: '$expenses.totalPrice' },
            avgExpense: { $avg: '$expenses.totalPrice' },
            maxExpense: { $max: '$expenses.totalPrice' },
            minExpense: { $min: '$expenses.totalPrice' },
            count: { $sum: 1 },
          },
        },
      ]);

      res.json(stats[0] || {
        totalExpenses: 0,
        avgExpense: 0,
        maxExpense: 0,
        minExpense: 0,
        count: 0,
      });
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  },

  // Get a monthly report of expenses
  async getMonthlyReport(req, res) {
    try {
      const monthlyStats = await DailyExpense.aggregate([
        { $match: { restaurantId: req.user.restaurantId } },
        { $unwind: '$expenses' },
        {
          $group: {
            _id: {
              year: { $year: '$date' },
              month: { $month: '$date' },
            },
            totalAmount: { $sum: '$expenses.totalPrice' },
            expenseCount: { $sum: 1 },
          },
        },
        { $sort: { '_id.year': -1, '_id.month': -1 } },
      ]);

      res.json(monthlyStats);
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  },

  async deleteExpense(req, res) {
    try {
      const dailyExpense = await DailyExpense.findOne({
        restaurantId: req.user.restaurantId,
        'expenses._id': req.params.expenseId
      });

      if (!dailyExpense) {
        return res.status(404).json({ message: 'Expense not found' });
      }

      dailyExpense.expenses = dailyExpense.expenses.filter(
        expense => expense._id.toString() !== req.params.expenseId
      );

      if (dailyExpense.expenses.length === 0) {
        await DailyExpense.findByIdAndDelete(dailyExpense._id);
      } else {
        await dailyExpense.save();
      }

      res.json({ message: 'Expense deleted successfully' });
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  },

  // Delete expenses by date range
  async deleteExpenseRange(req, res) {
    try {
      const { startDate, endDate } = req.body;
      
      if (!startDate || !endDate) {
        return res.status(400).json({ message: 'Start date and end date are required' });
      }
  
      const result = await DailyExpense.deleteMany({
        restaurantId: req.user.restaurantId,
        date: {
          $gte: new Date(startDate),
          $lte: new Date(endDate)
        }
      });
  
      res.json({ 
        message: 'Expenses deleted successfully',
        deletedCount: result.deletedCount
      });
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  }
};

module.exports = expenseController;