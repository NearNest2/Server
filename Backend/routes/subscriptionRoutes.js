const express = require('express');
const router = express.Router();
const subscriptionController = require('../controllers/subscriptionController');
const protect = require('../middleware/authMiddleware');

router.use('/payment-webhook', express.raw({ type: 'application/json' }));
router.use('/payment-webhook', subscriptionController.handlePaymentWebhook);

router.use(protect);

router.get('/status', subscriptionController.getSubscriptionStatus);
router.post('/create-order', subscriptionController.createSubscriptionOrder);
router.post('/verify-payment', subscriptionController.verifySubscriptionPayment);
router.post('/process-payment', subscriptionController.processPayment);

module.exports = router;
