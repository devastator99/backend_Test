const express = require('express');
const multer = require('multer');
const path = require('path');
const { body } = require('express-validator');
const imageController = require('../controllers/imageController');
const { handleValidationErrors } = require('../middleware/validation');
const { authRateLimitMiddleware } = require('../middleware/rateLimiter');

const router = express.Router();

// Configure multer for file uploads
const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/tiff', 'image/bmp'];
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only images are allowed.'), false);
  }
};

const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
    files: 10 // Maximum 10 files for batch processing
  },
  fileFilter
});

// Validation middleware
const uploadValidation = [
  body('width').optional().isInt({ min: 50, max: 2048 }).withMessage('Width must be between 50 and 2048'),
  body('height').optional().isInt({ min: 50, max: 2048 }).withMessage('Height must be between 50 and 2048'),
  body('quality').optional().isInt({ min: 10, max: 100 }).withMessage('Quality must be between 10 and 100'),
  body('format').optional().isIn(['webp', 'jpeg', 'png']).withMessage('Format must be webp, jpeg, or png'),
  body('thumbnails').optional().isBoolean().withMessage('Thumbnails must be a boolean'),
  handleValidationErrors
];

const svgValidation = [
  body('blurStrength').optional().isFloat({ min: 0.1, max: 5.0 }).withMessage('Blur strength must be between 0.1 and 5.0'),
  body('detail').optional().isFloat({ min: 0.0001, max: 0.01 }).withMessage('Detail must be between 0.0001 and 0.01'),
  body('minArea').optional().isInt({ min: 50, max: 1000 }).withMessage('Minimum area must be between 50 and 1000'),
  handleValidationErrors
];

// Routes
/**
 * @swagger
 * /api/images/upload:
 *   post:
 *     tags:
 *       - Images
 *     summary: Upload and process an image
 *     description: Upload an image and process it with resizing, compression, and thumbnail generation
 *     consumes:
 *       - multipart/form-data
 *     parameters:
 *       - in: formData
 *         name: image
 *         type: file
 *         required: true
 *         description: Image file to upload
 *       - in: formData
 *         name: width
 *         type: integer
 *         description: Target width (default: 800)
 *       - in: formData
 *         name: height
 *         type: integer
 *         description: Target height (default: 600)
 *       - in: formData
 *         name: quality
 *         type: integer
 *         description: Image quality (10-100, default: 80)
 *       - in: formData
 *         name: format
 *         type: string
 *         enum: [webp, jpeg, png]
 *         description: Output format (default: webp)
 *       - in: formData
 *         name: thumbnails
 *         type: boolean
 *         description: Generate thumbnails (default: true)
 *     responses:
 *       200:
 *         description: Image processed successfully
 *       400:
 *         description: Validation error
 *       429:
 *         description: Too many requests
 */
router.post('/upload', 
  authRateLimitMiddleware,
  upload.single('image'),
  uploadValidation,
  imageController.uploadImage
);

/**
 * @swagger
 * /api/images/convert-svg:
 *   post:
 *     tags:
 *       - Images
 *     summary: Convert image to SVG
 *     description: Convert an image to SVG format using edge detection
 *     consumes:
 *       - multipart/form-data
 *     parameters:
 *       - in: formData
 *         name: image
 *         type: file
 *         required: true
 *         description: Image file to convert
 *       - in: formData
 *         name: blurStrength
 *         type: number
 *         description: Blur strength for edge detection (0.1-5.0)
 *       - in: formData
 *         name: detail
 *         type: number
 *         description: Detail level for path approximation (0.0001-0.01)
 *       - in: formData
 *         name: minArea
 *         type: integer
 *         description: Minimum contour area (50-1000)
 *     responses:
 *       200:
 *         description: SVG conversion completed
 *       400:
 *         description: Validation error
 */
router.post('/convert-svg',
  authRateLimitMiddleware,
  upload.single('image'),
  svgValidation,
  imageController.convertToSVG
);

/**
 * @swagger
 * /api/images/metadata:
 *   post:
 *     tags:
 *       - Images
 *     summary: Get image metadata
 *     description: Extract metadata from uploaded image
 *     consumes:
 *       - multipart/form-data
 *     parameters:
 *       - in: formData
 *         name: image
 *         type: file
 *         required: true
 *         description: Image file to analyze
 *     responses:
 *       200:
 *         description: Image metadata retrieved
 *       400:
 *         description: Validation error
 */
router.post('/metadata',
  authRateLimitMiddleware,
  upload.single('image'),
  imageController.getImageMetadata
);

/**
 * @swagger
 * /api/images/batch:
 *   post:
 *     tags:
 *       - Images
 *     summary: Batch process multiple images
 *     description: Process multiple images with the same settings
 *     consumes:
 *       - multipart/form-data
 *     parameters:
 *       - in: formData
 *         name: images
 *         type: array
 *         items:
 *           type: file
 *         required: true
 *         description: Array of image files to process
 *       - in: formData
 *         name: width
 *         type: integer
 *         description: Target width (default: 800)
 *       - in: formData
 *         name: height
 *         type: integer
 *         description: Target height (default: 600)
 *       - in: formData
 *         name: quality
 *         type: integer
 *         description: Image quality (10-100, default: 80)
 *       - in: formData
 *         name: format
 *         type: string
 *         enum: [webp, jpeg, png]
 *         description: Output format (default: webp)
 *       - in: formData
 *         name: thumbnails
 *         type: boolean
 *         description: Generate thumbnails (default: true)
 *     responses:
 *       200:
 *         description: Batch processing completed
 *       400:
 *         description: Validation error
 */
router.post('/batch',
  authRateLimitMiddleware,
  upload.array('images', 10),
  uploadValidation,
  imageController.batchProcess
);

/**
 * @swagger
 * /api/images/{fileId}:
 *   delete:
 *     tags:
 *       - Images
 *     summary: Delete processed images
 *     description: Delete processed image and all associated thumbnails
 *     parameters:
 *       - in: path
 *         name: fileId
 *         type: string
 *         required: true
 *         description: Unique file identifier
 *     responses:
 *       200:
 *         description: Images deleted successfully
 *       404:
 *         description: File not found
 */
router.delete('/:fileId',
  imageController.deleteImages
);

module.exports = router;
