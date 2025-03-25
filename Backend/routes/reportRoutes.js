const express = require('express');
const router = express.Router();
const reportController = require('../controllers/reportController');
const protect = require('../middleware/authMiddleware');

router.get('/reports/item-sales', protect, reportController.getItemSalesReport);

module.exports = router;