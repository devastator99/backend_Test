const express = require('express');
const router = express.Router();
const {
  createProduct,
  getProduct,
  getAllProducts,
  updateProduct,
  deleteProduct,
  getProductsByCategory,
  searchProducts,
} = require('../controllers/productController');
const { auth, adminAuth } = require('../middleware/auth');
const { sanitizeInput } = require('../middleware/validation');
const {
  rateLimitMiddleware,
  sensitiveRateLimitMiddleware,
} = require('../middleware/rateLimiter');

router.use(sanitizeInput);

router.get('/', rateLimitMiddleware, getAllProducts);
router.get('/category/:category', rateLimitMiddleware, getProductsByCategory);
router.get('/search', rateLimitMiddleware, searchProducts);
router.get('/:id', rateLimitMiddleware, getProduct);
router.post('/', auth, adminAuth, sensitiveRateLimitMiddleware, createProduct);
router.put('/:id', auth, adminAuth, sensitiveRateLimitMiddleware, updateProduct);
router.delete('/:id', auth, adminAuth, sensitiveRateLimitMiddleware, deleteProduct);

module.exports = router;
