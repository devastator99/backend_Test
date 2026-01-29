const ImageProcessingService = require('../services/imageProcessingService');
const { ApiResponse } = require('../utils/response');
const { ValidationError, FileUploadError } = require('../utils/errors');

class ImageController {
  constructor() {
    this.imageService = new ImageProcessingService();
  }

  /**
   * Upload and process image
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next middleware function
   */
  async uploadImage(req, res, next) {
    try {
      if (!req.file) {
        throw new ValidationError('No file uploaded');
      }

      const options = {
        resize: {
          width: parseInt(req.body.width) || 800,
          height: parseInt(req.body.height) || 600
        },
        quality: parseInt(req.body.quality) || 80,
        format: req.body.format || 'webp',
        generateThumbnails: req.body.thumbnails !== 'false'
      };

      const result = await this.imageService.processImage(req.file, options);
      
      res.json(ApiResponse.success(result, 'Image processed successfully'));
    } catch (error) {
      next(error);
    }
  }

  /**
   * Convert image to SVG
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next middleware function
   */
  async convertToSVG(req, res, next) {
    try {
      if (!req.file) {
        throw new ValidationError('No file uploaded');
      }

      const options = {
        blurStrength: parseFloat(req.body.blurStrength) || 1.0,
        detail: parseFloat(req.body.detail) || 0.0015,
        minArea: parseInt(req.body.minArea) || 250
      };

      const result = await this.imageService.convertToSVG(req.file.buffer, options);
      
      res.json(ApiResponse.success(result, 'SVG conversion completed'));
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get image metadata
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next middleware function
   */
  async getImageMetadata(req, res, next) {
    try {
      if (!req.file) {
        throw new ValidationError('No file uploaded');
      }

      const metadata = await this.imageService.getImageDimensions(req.file.buffer);
      
      res.json(ApiResponse.success(metadata, 'Image metadata retrieved'));
    } catch (error) {
      next(error);
    }
  }

  /**
   * Delete processed images
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next middleware function
   */
  async deleteImages(req, res, next) {
    try {
      const { fileId } = req.params;
      
      if (!fileId) {
        throw new ValidationError('File ID is required');
      }

      const result = await this.imageService.deleteProcessedImages(fileId);
      
      res.json(ApiResponse.success({ deleted: result }, 'Images deleted successfully'));
    } catch (error) {
      next(error);
    }
  }

  /**
   * Batch process multiple images
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next middleware function
   */
  async batchProcess(req, res, next) {
    try {
      if (!req.files || req.files.length === 0) {
        throw new ValidationError('No files uploaded');
      }

      const options = {
        resize: {
          width: parseInt(req.body.width) || 800,
          height: parseInt(req.body.height) || 600
        },
        quality: parseInt(req.body.quality) || 80,
        format: req.body.format || 'webp',
        generateThumbnails: req.body.thumbnails !== 'false'
      };

      const results = [];
      
      for (const file of req.files) {
        try {
          const result = await this.imageService.processImage(file, options);
          results.push({
            success: true,
            originalName: file.originalname,
            data: result
          });
        } catch (error) {
          results.push({
            success: false,
            originalName: file.originalname,
            error: error.message
          });
        }
      }

      const processed = results.filter(r => r.success).length;
      const failed = results.filter(r => !r.success).length;
      
      res.json(ApiResponse.success({
        results,
        summary: {
          total: results.length,
          processed,
          failed
        }
      }, `Batch processing completed: ${processed} of ${results.length} images processed`));
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new ImageController();
