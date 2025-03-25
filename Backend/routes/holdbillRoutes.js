const express = require('express');
const router = express.Router();
const holdBillController = require('../controllers/holdBillController');
const protect = require('../middleware/authMiddleware');

router.post('/hold-bills', protect, holdBillController.createHoldBill);
router.get('/hold-bills', protect, holdBillController.getHoldBills);

router.get('/hold-bills/table/:tableId', protect, holdBillController.getHoldBillsByTableId);
router.put('/hold-bills/:id', protect, holdBillController.updateHoldBill);
router.post('/hold-bills/:id/resume', protect, holdBillController.resumeHoldBill);
router.delete('/hold-bills/:id', protect, holdBillController.deleteHoldBill);

module.exports = router;