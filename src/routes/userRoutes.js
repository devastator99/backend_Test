const express = require('express');
const router = express.Router();
const {
  createUser,
  loginUser,
  getUser,
  getAllUsers,
  updateUser,
  deleteUser,
  getProfile,
  uploadAvatar,
  removeAvatar,
} = require('../controllers/userController');
const { auth, adminAuth } = require('../middleware/auth');
const { sanitizeInput } = require('../middleware/validation');
const { uploadAvatar: upload, processAvatar } = require('../middleware/upload');
const {
  authRateLimitMiddleware,
  uploadRateLimitMiddleware,
  rateLimitMiddleware,
} = require('../middleware/rateLimiter');

router.use(sanitizeInput);

router.post('/register', authRateLimitMiddleware, createUser);
router.post('/login', authRateLimitMiddleware, loginUser);
router.get('/profile', auth, rateLimitMiddleware, getProfile);
router.post('/avatar', auth, uploadRateLimitMiddleware, upload, processAvatar, uploadAvatar);
router.delete('/avatar', auth, rateLimitMiddleware, removeAvatar);
router.get('/', auth, adminAuth, rateLimitMiddleware, getAllUsers);
router.get('/:id', auth, rateLimitMiddleware, getUser);
router.put('/:id', auth, rateLimitMiddleware, updateUser);
router.delete('/:id', auth, adminAuth, rateLimitMiddleware, deleteUser);

module.exports = router;
