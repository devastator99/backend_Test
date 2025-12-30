const multer = require('multer');
const path = require('path');
const fs = require('fs');
const sharp = require('sharp');
const { FileUploadError } = require('../utils/errors');

const ensureDirectoryExists = (dirPath) => {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
};

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(process.cwd(), 'uploads', 'avatars');
    ensureDirectoryExists(uploadDir);
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, `avatar-${uniqueSuffix}${ext}`);
  },
});

const fileFilter = (req, file, cb) => {
  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new FileUploadError('Invalid file type. Only JPEG, PNG, and WebP are allowed'), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
    files: 1,
  },
});

const processAvatar = async (req, res, next) => {
  if (!req.file) {
    return next();
  }

  try {
    const originalPath = req.file.path;
    const processedPath = originalPath.replace(/(\.[^.]+)$/, '_processed$1');

    await sharp(originalPath)
      .resize(200, 200, {
        fit: 'cover',
        position: 'center',
      })
      .jpeg({
        quality: 80,
        progressive: true,
      })
      .toFile(processedPath);

    fs.unlinkSync(originalPath);

    req.file.path = processedPath;
    req.file.filename = path.basename(processedPath);
    req.file.mimetype = 'image/jpeg';

    next();
  } catch (error) {
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    next(new FileUploadError('Failed to process image'));
  }
};

const uploadAvatar = upload.single('avatar');

const cleanupOldAvatar = async (avatarPath) => {
  if (avatarPath && fs.existsSync(avatarPath)) {
    try {
      fs.unlinkSync(avatarPath);
    } catch (error) {
      console.error('Failed to cleanup old avatar:', error);
    }
  }
};

const getAvatarUrl = (filename) => {
  if (!filename) return null;
  return `/uploads/avatars/${filename}`;
};

const validateAvatarUpload = (req, res, next) => {
  if (!req.file) {
    return res.status(400).json({
      success: false,
      message: 'Avatar file is required',
    });
  }
  next();
};

module.exports = {
  uploadAvatar,
  processAvatar,
  cleanupOldAvatar,
  getAvatarUrl,
  validateAvatarUpload,
};
