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

router.use(sanitizeInput);

router.post('/register', createUser);
router.post('/login', loginUser);
router.get('/profile', auth, getProfile);
router.post('/avatar', auth, upload, processAvatar, uploadAvatar);
router.delete('/avatar', auth, removeAvatar);
router.get('/', auth, adminAuth, getAllUsers);
router.get('/:id', auth, getUser);
router.put('/:id', auth, updateUser);
router.delete('/:id', auth, adminAuth, deleteUser);

module.exports = router;
