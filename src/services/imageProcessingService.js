const sharp = require('sharp');
const path = require('path');
const fs = require('fs').promises;
const { v4: uuidv4 } = require('uuid');

class ImageProcessingService {
  constructor() {
    this.allowedFormats = ['jpg', 'jpeg', 'png', 'webp', 'tiff', 'bmp'];
    this.maxFileSize = 10 * 1024 * 1024; // 10MB
    this.outputDir = path.join(process.cwd(), 'uploads', 'processed');
  }

  /**
   * Process uploaded image with various optimizations
   * @param {Object} file - Uploaded file object
   * @param {Object} options - Processing options
   * @returns {Promise<Object>} - Processed file information
   */
  async processImage(file, options = {}) {
    const {
      resize = { width: 800, height: 600 },
      quality = 80,
      format = 'webp',
      generateThumbnails = true
    } = options;

    try {
      // Validate file
      this.validateFile(file);

      // Generate unique filename
      const fileId = uuidv4();
      const originalName = path.parse(file.originalname).name;
      const outputPath = path.join(this.outputDir, fileId);
      
      await fs.mkdir(this.outputDir, { recursive: true });

      // Process main image
      const processedImage = await sharp(file.buffer)
        .resize(resize.width, resize.height, { 
          fit: 'inside',
          withoutEnlargement: true 
        })
        .jpeg({ quality })
        .toBuffer();

      const mainFileName = `${originalName}_${fileId}.${format}`;
      const mainFilePath = path.join(outputPath, mainFileName);
      await fs.writeFile(mainFilePath, processedImage);

      const result = {
        id: fileId,
        originalName: file.originalname,
        processedName: mainFileName,
        path: mainFilePath,
        size: processedImage.length,
        format,
        dimensions: await this.getImageDimensions(processedImage),
        url: `/uploads/processed/${mainFileName}`
      };

      // Generate thumbnails if requested
      if (generateThumbnails) {
        result.thumbnails = await this.generateThumbnails(processedImage, outputPath, originalName, fileId);
      }

      return result;
    } catch (error) {
      throw new Error(`Image processing failed: ${error.message}`);
    }
  }

  /**
   * Generate multiple thumbnail sizes
   * @param {Buffer} imageBuffer - Image buffer
   * @param {string} outputPath - Output directory path
   * @param {string} originalName - Original filename
   * @param {string} fileId - Unique file identifier
   * @returns {Promise<Array>} - Array of thumbnail information
   */
  async generateThumbnails(imageBuffer, outputPath, originalName, fileId) {
    const sizes = [
      { name: 'small', width: 150, height: 150 },
      { name: 'medium', width: 300, height: 300 },
      { name: 'large', width: 500, height: 500 }
    ];

    const thumbnails = [];

    for (const size of sizes) {
      const thumbnailBuffer = await sharp(imageBuffer)
        .resize(size.width, size.height, { 
          fit: 'cover',
          position: 'center' 
        })
        .jpeg({ quality: 70 })
        .toBuffer();

      const thumbnailName = `${originalName}_${fileId}_${size.name}.jpg`;
      const thumbnailPath = path.join(outputPath, thumbnailName);
      
      await fs.writeFile(thumbnailPath, thumbnailBuffer);

      thumbnails.push({
        size: size.name,
        width: size.width,
        height: size.height,
        path: thumbnailPath,
        url: `/uploads/processed/${thumbnailName}`,
        fileSize: thumbnailBuffer.length
      });
    }

    return thumbnails;
  }

  /**
   * Get image dimensions from buffer
   * @param {Buffer} buffer - Image buffer
   * @returns {Promise<Object>} - Width and height
   */
  async getImageDimensions(buffer) {
    const metadata = await sharp(buffer).metadata();
    return {
      width: metadata.width,
      height: metadata.height,
      format: metadata.format,
      channels: metadata.channels,
      density: metadata.density
    };
  }

  /**
   * Validate uploaded file
   * @param {Object} file - Uploaded file object
   * @throws {Error} - If validation fails
   */
  validateFile(file) {
    if (!file || !file.buffer) {
      throw new Error('No file provided');
    }

    if (file.size > this.maxFileSize) {
      throw new Error(`File size exceeds maximum limit of ${this.maxFileSize / 1024 / 1024}MB`);
    }

    const extension = path.extname(file.originalname).toLowerCase().slice(1);
    if (!this.allowedFormats.includes(extension)) {
      throw new Error(`File format not supported. Allowed formats: ${this.allowedFormats.join(', ')}`);
    }
  }

  /**
   * Convert image to SVG using edge detection
   * @param {Buffer} imageBuffer - Image buffer
   * @param {Object} options - SVG conversion options
   * @returns {Promise<Object>} - SVG file information
   */
  async convertToSVG(imageBuffer, options = {}) {
    const {
      blurStrength = 1.0,
      detail = 0.0015,
      minArea = 250
    } = options;

    try {
      // This would integrate with your svgt.py script
      // For now, we'll create a placeholder implementation
      const fileId = uuidv4();
      const svgFileName = `converted_${fileId}.svg`;
      const svgPath = path.join(this.outputDir, svgFileName);

      // TODO: Integrate with Python script for actual SVG conversion
      // For now, create a simple SVG placeholder
      const metadata = await sharp(imageBuffer).metadata();
      const svgContent = `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${metadata.width}" height="${metadata.height}" xmlns="http://www.w3.org/2000/svg">
  <rect width="100%" height="100%" fill="#f0f0f0"/>
  <text x="50%" y="50%" text-anchor="middle" dy=".3em" font-family="Arial" font-size="14">
    SVG Conversion Placeholder
  </text>
</svg>`;

      await fs.writeFile(svgPath, svgContent);

      return {
        id: fileId,
        fileName: svgFileName,
        path: svgPath,
        url: `/uploads/processed/${svgFileName}`,
        size: svgContent.length,
        dimensions: { width: metadata.width, height: metadata.height }
      };
    } catch (error) {
      throw new Error(`SVG conversion failed: ${error.message}`);
    }
  }

  /**
   * Delete processed image and thumbnails
   * @param {string} fileId - File identifier
   * @returns {Promise<boolean>} - Success status
   */
  async deleteProcessedImages(fileId) {
    try {
      const files = await fs.readdir(this.outputDir);
      const filesToDelete = files.filter(file => file.includes(fileId));

      for (const file of filesToDelete) {
        const filePath = path.join(this.outputDir, file);
        await fs.unlink(filePath);
      }

      return true;
    } catch (error) {
      throw new Error(`Failed to delete images: ${error.message}`);
    }
  }
}

module.exports = ImageProcessingService;
