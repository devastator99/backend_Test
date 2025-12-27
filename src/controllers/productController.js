const { body, validationResult } = require('express-validator');
const productService = require('../services/productService');

const productValidation = [
  body('name').trim().isLength({ min: 2 }).withMessage('Product name must be at least 2 characters'),
  body('price').isFloat({ gt: 0 }).withMessage('Price must be a positive number'),
  body('category').trim().notEmpty().withMessage('Category is required'),
];

const updateProductValidation = [
  body('name').optional().trim().isLength({ min: 2 }).withMessage('Product name must be at least 2 characters'),
  body('price').optional().isFloat({ gt: 0 }).withMessage('Price must be a positive number'),
  body('category').optional().trim().notEmpty().withMessage('Category is required'),
  body('inStock').optional().isBoolean().withMessage('inStock must be a boolean'),
];

const createProduct = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array(),
      });
    }

    const product = await productService.createProduct(req.body);
    res.status(201).json({
      success: true,
      message: 'Product created successfully',
      data: product,
    });
  } catch (error) {
    next(error);
  }
};

const getProduct = async (req, res, next) => {
  try {
    const product = await productService.getProductById(req.params.id);
    res.json({
      success: true,
      data: product,
    });
  } catch (error) {
    next(error);
  }
};

const getAllProducts = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const category = req.query.category || null;
    
    const result = await productService.getAllProducts(page, limit, category);
    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

const updateProduct = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array(),
      });
    }

    const product = await productService.updateProduct(req.params.id, req.body);
    res.json({
      success: true,
      message: 'Product updated successfully',
      data: product,
    });
  } catch (error) {
    next(error);
  }
};

const deleteProduct = async (req, res, next) => {
  try {
    const result = await productService.deleteProduct(req.params.id);
    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

const getProductsByCategory = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const category = req.params.category;
    
    const result = await productService.getProductsByCategory(category, page, limit);
    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

const searchProducts = async (req, res, next) => {
  try {
    const query = req.query.q;
    if (!query) {
      return res.status(400).json({
        success: false,
        message: 'Search query is required',
      });
    }

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    
    const result = await productService.searchProducts(query, page, limit);
    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createProduct,
  getProduct,
  getAllProducts,
  updateProduct,
  deleteProduct,
  getProductsByCategory,
  searchProducts,
  productValidation,
  updateProductValidation,
};
