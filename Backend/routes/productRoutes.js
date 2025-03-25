const express = require('express');
const router = express.Router();
const { productController, upload } = require('../controllers/productController');
const protect = require('../middleware/authMiddleware');

router.get('/my-products', protect, productController.getRestaurantOwnerProducts);
router.post('/products', protect, upload.single('image'), productController.createProduct);
router.put('/products/:id', protect, upload.single('image'), productController.updateProduct);
router.delete('/products/:id', protect, productController.deleteProduct);
router.patch('/products/:id/stock', protect, productController.updateStockStatus);

router.get('/public/:restaurantId/menu', productController.getPublicProducts);
router.get('/public/product/:productId/availability', productController.checkProductAvailability);

module.exports = router;