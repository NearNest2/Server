const express = require('express');
const router = express.Router();
const tableController = require('../controllers/tableController');
const protect = require('../middleware/authMiddleware');

router.get('/tables', protect, tableController.getTables);
router.post('/tables', protect, tableController.createTable);
router.post('/tables/bulk', protect, tableController.createBulkTables);
router.patch('/tables/:tableId/status', protect, tableController.updateTableStatus);
router.delete('/tables/:tableId', protect, tableController.deleteTable);

module.exports = router;