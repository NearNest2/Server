// settingsRoute.js
const express = require('express');
const router = express.Router();
const { settingsController, upload } = require('../controllers/settingsController');
const protect = require('../middleware/authMiddleware');

router.use(protect);

router.get('/settings', settingsController.getSettings);
router.post('/settings', upload.single('logo'), settingsController.updateSettings);

module.exports = router;