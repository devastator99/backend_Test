const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const sharp = require('sharp');
const { FileUploadError } = require('../utils/errors');
const { securityLogger } = require('../utils/logger');

const ensureDirectoryExists = async (dirPath) => {
  try {
    await fs.access(dirPath);
  } catch {
    await fs.mkdir(dirPath, { recursive: true });
  }
};

const generateSecureFilename = (originalname) => {
  const timestamp = Date.now();
  const randomBytes = Math.random().toString(36).substring(2, 15);
  const ext = path.extname(originalname).toLowerCase();
  const sanitizedName = path.basename(originalname, ext)
    .replace(/[^a-zA-Z0-9]/g, '_')
    .substring(0, 20);
  return `${sanitizedName}_${timestamp}_${randomBytes}${ext}`;
};

const validateImageFile = async (filePath) => {
  try {
    const metadata = await sharp(filePath).metadata();
    
    if (!metadata.format || !['jpeg', 'png', 'webp'].includes(metadata.format)) {
      throw new Error('Invalid image format');
    }
    
    if (metadata.width > 5000 || metadata.height > 5000) {
      throw new Error('Image dimensions too large');
    }
    
    return true;
  } catch (error) {
    throw new FileUploadError(`Invalid image file: ${error.message}`);
  }
};

const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    try {
      const uploadDir = path.join(process.cwd(), 'uploads', 'avatars');
      await ensureDirectoryExists(uploadDir);
      cb(null, uploadDir);
    } catch (error) {
      cb(new FileUploadError('Failed to create upload directory'), null);
    }
  },
  filename: (req, file, cb) => {
    try {
      const filename = generateSecureFilename(file.originalname);
      cb(null, filename);
    } catch (error) {
      cb(new FileUploadError('Failed to generate filename'), null);
    }
  },
});

const fileFilter = (req, file, cb) => {
  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
  const allowedExtensions = ['.jpg', '.jpeg', '.png', '.webp'];
  
  if (!allowedTypes.includes(file.mimetype)) {
    securityLogger.logSuspiciousActivity('Invalid file type upload attempt', {
      mimetype: file.mimetype,
      originalname: file.originalname,
      ip: req.ip,
    });
    return cb(new FileUploadError('Invalid file type. Only JPEG, PNG, and WebP are allowed'), false);
  }
  
  const ext = path.extname(file.originalname).toLowerCase();
  if (!allowedExtensions.includes(ext)) {
    securityLogger.logSuspiciousActivity('Invalid file extension upload attempt', {
      extension: ext,
      originalname: file.originalname,
      ip: req.ip,
    });
    return cb(new FileUploadError('Invalid file extension. Only .jpg, .jpeg, .png, and .webp are allowed'), false);
  }
  
  cb(null, true);
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
    files: 1,
    fields: 10,
    fieldNameSize: 100,
  },
});

const processAvatar = async (req, res, next) => {
  if (!req.file) {
    return next();
  }

  let originalPath = req.file.path;
  let processedPath = null;

  try {
    await validateImageFile(originalPath);
    
    const ext = path.extname(originalPath);
    const baseName = path.basename(originalPath, ext);
    processedPath = path.join(path.dirname(originalPath), `${baseName}_processed.jpg`);

    const transformer = sharp(originalPath)
      .resize(200, 200, {
        fit: 'cover',
        position: 'center',
        withoutEnlargement: true,
      })
      .jpeg({
        quality: 85,
        progressive: true,
        mozjpeg: true,
      });

    await transformer.toFile(processedPath);

    const stats = await fs.stat(processedPath);
    if (stats.size === 0) {
      throw new Error('Processed file is empty');
    }

    try {
      await fs.unlink(originalPath);
    } catch (unlinkError) {
      console.warn('Failed to delete original file:', unlinkError.message);
    }

    req.file.path = processedPath;
    req.file.filename = path.basename(processedPath);
    req.file.mimetype = 'image/jpeg';
    req.file.size = stats.size;

    next();
  } catch (error) {
    securityLogger.logSuspiciousActivity('Avatar processing failed', {
      error: error.message,
      originalPath,
      processedPath,
      ip: req.ip,
    });

    try {
      if (originalPath && await fs.access(originalPath).then(() => true).catch(() => false)) {
        await fs.unlink(originalPath);
      }
      if (processedPath && await fs.access(processedPath).then(() => true).catch(() => false)) {
        await fs.unlink(processedPath);
      }
    } catch (cleanupError) {
      console.error('Failed to cleanup files:', cleanupError.message);
    }

    next(new FileUploadError(`Failed to process image: ${error.message}`));
  }
};

const uploadAvatar = upload.single('avatar');

const cleanupOldAvatar = async (avatarUrl) => {
  if (!avatarUrl) return;
  
  try {
    const filename = path.basename(avatarUrl);
    const filePath = path.join(process.cwd(), 'uploads', 'avatars', filename);
    
    await fs.access(filePath);
    await fs.unlink(filePath);
  } catch (error) {
    if (error.code !== 'ENOENT') {
      console.error('Failed to cleanup old avatar:', error.message);
    }
  }
};

const getAvatarUrl = (filename) => {
  if (!filename) return null;
  return `/uploads/avatars/${encodeURIComponent(filename)}`;
};

const validateAvatarUpload = (req, res, next) => {
  if (!req.file) {
    return res.status(400).json({
      success: false,
      message: 'Avatar file is required',
      timestamp: new Date().toISOString(),
    });
  }
  next();
};

const uploadLimits = {
  maxFileSize: 5 * 1024 * 1024, // 5MB
  allowedTypes: ['image/jpeg', 'image/png', 'image/webp'],
  allowedExtensions: ['.jpg', '.jpeg', '.png', '.webp'],
  maxDimensions: { width: 5000, height: 5000 },
  outputDimensions: { width: 200, height: 200 },
  outputQuality: 85,
};

module.exports = {
  uploadAvatar,
  processAvatar,
  cleanupOldAvatar,
  getAvatarUrl,
  validateAvatarUpload,
  uploadLimits,
  generateSecureFilename,
  validateImageFile,
};
