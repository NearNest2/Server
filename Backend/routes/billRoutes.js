// billRoutes.js
const express = require('express');
const router = express.Router();
const billController = require('../controllers/billController');
const protect = require('../middleware/authMiddleware');

router.get('/bills', protect, billController.getBills);
router.get('/bills/summary', protect, billController.getBillsSummary);
router.get('/bills/:id', protect, billController.getBillById);
router.get('/tables/:tableId/active-bill', protect, billController.getTableActiveBill);

router.post('/bills/:tableId/save', protect, billController.saveBill);

router.patch('/bills/:id', protect, billController.updateBill);
router.patch('/bills/:id/payment-method', protect, billController.updatePaymentMethod);

module.exports = router;