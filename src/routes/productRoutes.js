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
  productValidation,
  updateProductValidation,
} = require('../controllers/productController');
const { auth, adminAuth } = require('../middleware/auth');

router.post('/', auth, adminAuth, productValidation, createProduct);
router.get('/', getAllProducts);
router.get('/search', searchProducts);
router.get('/category/:category', getProductsByCategory);
router.get('/:id', getProduct);
router.put('/:id', auth, adminAuth, updateProductValidation, updateProduct);
router.delete('/:id', auth, adminAuth, deleteProduct);

module.exports = router;
