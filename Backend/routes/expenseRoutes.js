const express = require('express');
const router = express.Router();
const expenseController = require('../controllers/expenseController');
const protect = require('../middleware/authMiddleware');

router.use(protect);
router.get('/expenses', expenseController.getExpenses);
router.post('/expenses', expenseController.createExpense);
router.patch('/expenses/:expenseId', expenseController.updateExpense);
router.delete('/expenses/:expenseId', expenseController.deleteExpense);
router.delete('/expenses-range', expenseController.deleteExpenseRange);
router.get('/stats', expenseController.getExpenseStats);
router.get('/monthly-report', expenseController.getMonthlyReport);

module.exports = router;