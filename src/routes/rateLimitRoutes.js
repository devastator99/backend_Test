const express = require('express');
const { body, param } = require('express-validator');
const rateLimitController = require('../controllers/rateLimitController');
const authMiddleware = require('../middleware/auth');
const { authRateLimitMiddleware } = require('../middleware/rateLimiter');

const router = express.Router();

// Apply authentication to all rate limit routes
router.use(authMiddleware);

// Validation middleware
const updateUserTierValidation = [
  body('tier').isIn(['free', 'premium', 'enterprise']).withMessage('Tier must be free, premium, or enterprise')
];

const userIdValidation = [
  param('userId').isUUID().withMessage('Valid user ID is required')
];

// Routes
/**
 * @swagger
 * /api/rate-limits/status:
 *   get:
 *     tags:
 *       - Rate Limits
 *     summary: Get rate limit status
 *     description: Get current rate limit status for the authenticated user
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Rate limit status retrieved successfully
 *       401:
 *         description: Unauthorized
 */
router.get('/status',
  authRateLimitMiddleware,
  rateLimitController.getRateLimitStatus
);

/**
 * @swagger
 * /api/rate-limits/stats:
 *   get:
 *     tags:
 *       - Rate Limits
 *     summary: Get rate limit statistics
 *     description: Get rate limit statistics (admin only)
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Rate limit statistics retrieved successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Admin access required
 */
router.get('/stats',
  authRateLimitMiddleware,
  rateLimitController.getRateLimitStats
);

/**
 * @swagger
 * /api/rate-limits/users/{userId}/reset:
 *   post:
 *     tags:
 *       - Rate Limits
 *     summary: Reset user rate limits
 *     description: Reset rate limits for a specific user (admin only)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: User ID
 *     responses:
 *       200:
 *         description: User rate limits reset successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Admin access required
 */
router.post('/users/:userId/reset',
  authRateLimitMiddleware,
  userIdValidation,
  rateLimitController.resetUserRateLimits
);

/**
 * @swagger
 * /api/rate-limits/users/{userId}/tier:
 *   put:
 *     tags:
 *       - Rate Limits
 *     summary: Update user tier
 *     description: Update a user's subscription tier (admin only)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: User ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - tier
 *             properties:
 *               tier:
 *                 type: string
 *                 enum: [free, premium, enterprise]
 *                 description: User subscription tier
 *     responses:
 *       200:
 *         description: User tier updated successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Admin access required
 */
router.put('/users/:userId/tier',
  authRateLimitMiddleware,
  userIdValidation,
  updateUserTierValidation,
  rateLimitController.updateUserTier
);

module.exports = router;
