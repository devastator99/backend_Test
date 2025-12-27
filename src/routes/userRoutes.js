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
  userValidation,
  loginValidation,
} = require('../controllers/userController');
const { auth, adminAuth } = require('../middleware/auth');

router.post('/register', userValidation, createUser);
router.post('/login', loginValidation, loginUser);
router.get('/profile', auth, getProfile);
router.get('/', auth, adminAuth, getAllUsers);
router.get('/:id', auth, getUser);
router.put('/:id', auth, updateUser);
router.delete('/:id', auth, adminAuth, deleteUser);

module.exports = router;
