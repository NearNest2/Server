const express = require('express');
const router = express.Router();
const kotController = require('../controllers/kotController');
const protect = require('../middleware/authMiddleware');

router.get('/kot', protect, kotController.getKOTStatus);

module.exports = router;