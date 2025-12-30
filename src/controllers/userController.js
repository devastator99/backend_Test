const { ApiResponse } = require('../utils/response');
const { NotFoundError, ConflictError, UnauthorizedError } = require('../utils/errors');
const {
  userRegistrationValidation,
  userLoginValidation,
  userUpdateValidation,
  handleValidationErrors,
} = require('../middleware/validation');
const { getAvatarUrl, cleanupOldAvatar } = require('../middleware/upload');
const userService = require('../services/userService');

const createUser = async (req, res, next) => {
  try {
    const user = await userService.createUser(req.body);
    res.status(201).json(ApiResponse.created(user, 'User created successfully'));
  } catch (error) {
    if (error.message.includes('already exists')) {
      return next(new ConflictError(error.message));
    }
    next(error);
  }
};

const loginUser = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const result = await userService.loginUser(email, password);
    
    res.json(ApiResponse.success(result, 'Login successful'));
  } catch (error) {
    if (error.message.includes('Invalid credentials')) {
      return next(new UnauthorizedError(error.message));
    }
    next(error);
  }
};

const getUser = async (req, res, next) => {
  try {
    const user = await userService.getUserById(req.params.id);
    res.json(ApiResponse.success(user));
  } catch (error) {
    if (error.message.includes('not found')) {
      return next(new NotFoundError('User'));
    }
    next(error);
  }
};

const getAllUsers = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    
    const result = await userService.getAllUsers(page, limit);
    res.json(ApiResponse.paginated(result.users, result.pagination));
  } catch (error) {
    next(error);
  }
};

const updateUser = async (req, res, next) => {
  try {
    const user = await userService.updateUser(req.params.id, req.body);
    res.json(ApiResponse.success(user, 'User updated successfully'));
  } catch (error) {
    if (error.message.includes('not found')) {
      return next(new NotFoundError('User'));
    }
    if (error.message.includes('already in use')) {
      return next(new ConflictError(error.message));
    }
    next(error);
  }
};

const deleteUser = async (req, res, next) => {
  try {
    const result = await userService.deleteUser(req.params.id);
    res.json(ApiResponse.success(result, 'User deleted successfully'));
  } catch (error) {
    if (error.message.includes('not found')) {
      return next(new NotFoundError('User'));
    }
    next(error);
  }
};

const getProfile = async (req, res, next) => {
  try {
    const user = await userService.getUserById(req.user.id);
    res.json(ApiResponse.success(user));
  } catch (error) {
    if (error.message.includes('not found')) {
      return next(new NotFoundError('User'));
    }
    next(error);
  }
};

const uploadAvatar = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json(ApiResponse.error('Avatar file is required', 400));
    }

    const avatarUrl = getAvatarUrl(req.file.filename);
    
    const user = await userService.updateUserAvatar(req.user.id, avatarUrl, req.file.path);
    
    res.json(ApiResponse.success(user, 'Avatar uploaded successfully'));
  } catch (error) {
    if (req.file && req.file.path) {
      cleanupOldAvatar(req.file.path);
    }
    
    if (error.message.includes('not found')) {
      return next(new NotFoundError('User'));
    }
    next(error);
  }
};

const removeAvatar = async (req, res, next) => {
  try {
    const user = await userService.getUserById(req.user.id);
    
    if (user.profile && user.profile.avatar) {
      const avatarPath = user.profile.avatar.replace('/uploads/avatars/', '');
      const fullPath = require('path').join(process.cwd(), 'uploads', 'avatars', avatarPath);
      cleanupOldAvatar(fullPath);
    }

    const updatedUser = await userService.updateUserAvatar(req.user.id, null, null);
    
    res.json(ApiResponse.success(updatedUser, 'Avatar removed successfully'));
  } catch (error) {
    if (error.message.includes('not found')) {
      return next(new NotFoundError('User'));
    }
    next(error);
  }
};

module.exports = {
  createUser: [userRegistrationValidation, handleValidationErrors, createUser],
  loginUser: [userLoginValidation, handleValidationErrors, loginUser],
  getUser: getUser,
  getAllUsers: getAllUsers,
  updateUser: [userUpdateValidation, handleValidationErrors, updateUser],
  deleteUser: deleteUser,
  getProfile: getProfile,
  uploadAvatar: uploadAvatar,
  removeAvatar: removeAvatar,
};
