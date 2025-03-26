const express = require('express');
const router = express.Router();
const { userController, autoLogin } = require('../controllers/userController');
const authMiddleware = require('../middleware/authMiddleware');
const rateLimiter = require('express-rate-limit');

const authLimiter = rateLimiter({
  windowMs: 15*60*1000, 
  max: 10, 
  message: 'Too many authentication attempts, please try again later'
});

router.post('/signup', userController.signUp);
router.post('/verify-otp', userController.verifyOTP);
router.post('/signin', userController.signIn);
router.post('/check-outlets', userController.checkOutlets);
router.post('/select-outlet', userController.selectOutlet);
router.post('/available-outlets', userController.getAvailableOutlets);
router.post('/auto-login', autoLogin); 
router.post('/account/delete', userController.deleteAccount);
router.post('/nearby-restaurants', userController.searchNearbyRestaurants);

router.get('/restaurant/:restaurantId', userController.getRestaurantPublicInfo);


router.get('/profile', authMiddleware, userController.getProfile);
router.put('/profile/update', authMiddleware, userController.updateProfile);
router.post('/password/change', authMiddleware, userController.changePassword);
router.post('/logout', authMiddleware, userController.logout);

router.post('/password/forgot', authLimiter, userController.forgotPassword);
router.post('/password/reset', authLimiter, userController.resetPassword);

module.exports = router;
