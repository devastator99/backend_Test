const userRateLimiter = require('../middleware/userRateLimiter');
const { ApiResponse } = require('../utils/response');
const { ValidationError, ForbiddenError } = require('../utils/errors');

class RateLimitController {
  /**
   * Get user's current rate limit status
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next middleware function
   */
  async getRateLimitStatus(req, res, next) {
    try {
      const status = await userRateLimiter.getUserRateLimitStatus(req);
      
      res.json(ApiResponse.success(status, 'Rate limit status retrieved'));
    } catch (error) {
      next(error);
    }
  }

  /**
   * Reset user's rate limits (admin only)
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next middleware function
   */
  async resetUserRateLimits(req, res, next) {
    try {
      const { userId } = req.params;
      
      if (!userId) {
        throw new ValidationError('User ID is required');
      }

      // Check if user is admin
      if (req.user.role !== 'ADMIN') {
        throw new ForbiddenError('Admin access required');
      }

      const userKey = `user:${userId}`;
      const success = await userRateLimiter.resetUserRateLimits(userKey);
      
      if (!success) {
        throw new ValidationError('Failed to reset rate limits');
      }

      res.json(ApiResponse.success({ reset: true }, 'User rate limits reset successfully'));
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update user tier (admin only)
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next middleware function
   */
  async updateUserTier(req, res, next) {
    try {
      const { userId } = req.params;
      const { tier } = req.body;
      
      if (!userId || !tier) {
        throw new ValidationError('User ID and tier are required');
      }

      // Check if user is admin
      if (req.user.role !== 'ADMIN') {
        throw new ForbiddenError('Admin access required');
      }

      const validTiers = ['free', 'premium', 'enterprise'];
      if (!validTiers.includes(tier)) {
        throw new ValidationError('Invalid tier. Must be one of: free, premium, enterprise');
      }

      userRateLimiter.updateUserTier(userId, tier);
      
      res.json(ApiResponse.success({ userId, tier }, 'User tier updated successfully'));
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get rate limit statistics (admin only)
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next middleware function
   */
  async getRateLimitStats(req, res, next) {
    try {
      // Check if user is admin
      if (req.user.role !== 'ADMIN') {
        throw new ForbiddenError('Admin access required');
      }

      // This is a simplified implementation
      // In a real application, you would collect more detailed statistics
      const stats = {
        tiers: {
          free: {
            windowMs: 15 * 60 * 1000,
            maxRequests: 100,
            maxUploads: 10,
            maxEmails: 5
          },
          premium: {
            windowMs: 15 * 60 * 1000,
            maxRequests: 500,
            maxUploads: 50,
            maxEmails: 25
          },
          enterprise: {
            windowMs: 15 * 60 * 1000,
            maxRequests: 2000,
            maxUploads: 200,
            maxEmails: 100
          }
        },
        currentUsers: {
          free: 0, // Would be calculated from actual user data
          premium: 0,
          enterprise: 0
        },
        totalRequests: 0, // Would be calculated from actual usage data
        blockedRequests: 0
      };
      
      res.json(ApiResponse.success(stats, 'Rate limit statistics retrieved'));
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new RateLimitController();
