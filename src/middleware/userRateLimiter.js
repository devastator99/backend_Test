const { RateLimiterMemory } = require('rate-limiter-flexible');
const { cacheService } = require('../utils/cache');

class UserRateLimiter {
  constructor() {
    // Default rate limits per user tier
    this.defaultLimits = {
      free: {
        windowMs: 15 * 60 * 1000, // 15 minutes
        maxRequests: 100,
        maxUploads: 10,
        maxEmails: 5
      },
      premium: {
        windowMs: 15 * 60 * 1000, // 15 minutes
        maxRequests: 500,
        maxUploads: 50,
        maxEmails: 25
      },
      enterprise: {
        windowMs: 15 * 60 * 1000, // 15 minutes
        maxRequests: 2000,
        maxUploads: 200,
        maxEmails: 100
      }
    };

    // Create rate limiters for different operations
    this.generalLimiter = new RateLimiterMemory({
      keyGenerator: (req) => this.getUserKey(req),
      points: 100, // Default points
      duration: 900, // 15 minutes in seconds
      blockDuration: 60 // Block for 1 minute if limit exceeded
    });

    this.uploadLimiter = new RateLimiterMemory({
      keyGenerator: (req) => this.getUserKey(req),
      points: 10, // Default uploads
      duration: 900,
      blockDuration: 60
    });

    this.emailLimiter = new RateLimiterMemory({
      keyGenerator: (req) => this.getUserKey(req),
      points: 5, // Default emails
      duration: 900,
      blockDuration: 60
    });

    this.jobLimiter = new RateLimiterMemory({
      keyGenerator: (req) => this.getUserKey(req),
      points: 50, // Default jobs
      duration: 900,
      blockDuration: 60
    });
  }

  /**
   * Generate user-specific key for rate limiting
   * @param {Object} req - Express request object
   * @returns {string} - User key
   */
  getUserKey(req) {
    // Try to get user ID from authenticated user
    if (req.user && req.user.id) {
      return `user:${req.user.id}`;
    }
    
    // Fall back to IP address
    return `ip:${req.ip}`;
  }

  /**
   * Get user tier from request
   * @param {Object} req - Express request object
   * @returns {string} - User tier
   */
  getUserTier(req) {
    if (req.user && req.user.tier) {
      return req.user.tier;
    }
    
    // Check cache for user tier
    const cacheKey = `user_tier:${this.getUserKey(req)}`;
    const cachedTier = cacheService.get(cacheKey);
    
    if (cachedTier) {
      return cachedTier;
    }
    
    // Default to free tier
    return 'free';
  }

  /**
   * Get rate limits for user tier
   * @param {string} tier - User tier
   * @returns {Object} - Rate limits
   */
  getLimitsForTier(tier) {
    return this.defaultLimits[tier] || this.defaultLimits.free;
  }

  /**
   * Update rate limiter configuration for user
   * @param {Object} req - Express request object
   * @param {Object} limiter - Rate limiter instance
   * @param {number} points - Points to consume
   * @returns {Promise<Object>} - Rate limit result
   */
  async checkRateLimit(req, limiter, points = 1) {
    const userTier = this.getUserTier(req);
    const limits = this.getLimitsForTier(userTier);
    
    // Update limiter configuration based on user tier
    limiter.points = limits.maxRequests;
    limiter.duration = Math.floor(limits.windowMs / 1000);
    
    try {
      const result = await limiter.consume(this.getUserKey(req), points);
      
      // Return rate limit headers
      return {
        success: true,
        remainingPoints: result.remainingPoints,
        msBeforeNext: result.msBeforeNext,
        totalHits: result.totalHits
      };
    } catch (rejRes) {
      // Rate limit exceeded
      return {
        success: false,
        remainingPoints: 0,
        msBeforeNext: rejRes.msBeforeNext,
        totalHits: rejRes.totalHits,
        retryAfter: Math.ceil(rejRes.msBeforeNext / 1000)
      };
    }
  }

  /**
   * General API rate limiting middleware
   * @param {Object} options - Rate limiting options
   * @returns {Function} - Express middleware
   */
  generalRateLimit(options = {}) {
    const { points = 1 } = options;
    
    return async (req, res, next) => {
      try {
        const result = await this.checkRateLimit(req, this.generalLimiter, points);
        
        // Set rate limit headers
        res.set({
          'X-RateLimit-Limit': this.generalLimiter.points,
          'X-RateLimit-Remaining': result.remainingPoints,
          'X-RateLimit-Reset': new Date(Date.now() + result.msBeforeNext).toISOString()
        });
        
        if (!result.success) {
          res.set('Retry-After', result.retryAfter);
          return res.status(429).json({
            success: false,
            message: 'Too many requests',
            retryAfter: result.retryAfter,
            tier: this.getUserTier(req)
          });
        }
        
        next();
      } catch (error) {
        next(error);
      }
    };
  }

  /**
   * Upload rate limiting middleware
   * @param {Object} options - Rate limiting options
   * @returns {Function} - Express middleware
   */
  uploadRateLimit(options = {}) {
    const { points = 1 } = options;
    
    return async (req, res, next) => {
      try {
        const userTier = this.getUserTier(req);
        const limits = this.getLimitsForTier(userTier);
        
        // Update upload limiter
        this.uploadLimiter.points = limits.maxUploads;
        
        const result = await this.checkRateLimit(req, this.uploadLimiter, points);
        
        res.set({
          'X-RateLimit-Upload-Limit': this.uploadLimiter.points,
          'X-RateLimit-Upload-Remaining': result.remainingPoints,
          'X-RateLimit-Upload-Reset': new Date(Date.now() + result.msBeforeNext).toISOString()
        });
        
        if (!result.success) {
          res.set('Retry-After', result.retryAfter);
          return res.status(429).json({
            success: false,
            message: 'Upload rate limit exceeded',
            retryAfter: result.retryAfter,
            tier: userTier
          });
        }
        
        next();
      } catch (error) {
        next(error);
      }
    };
  }

  /**
   * Email rate limiting middleware
   * @param {Object} options - Rate limiting options
   * @returns {Function} - Express middleware
   */
  emailRateLimit(options = {}) {
    const { points = 1 } = options;
    
    return async (req, res, next) => {
      try {
        const userTier = this.getUserTier(req);
        const limits = this.getLimitsForTier(userTier);
        
        // Update email limiter
        this.emailLimiter.points = limits.maxEmails;
        
        const result = await this.checkRateLimit(req, this.emailLimiter, points);
        
        res.set({
          'X-RateLimit-Email-Limit': this.emailLimiter.points,
          'X-RateLimit-Email-Remaining': result.remainingPoints,
          'X-RateLimit-Email-Reset': new Date(Date.now() + result.msBeforeNext).toISOString()
        });
        
        if (!result.success) {
          res.set('Retry-After', result.retryAfter);
          return res.status(429).json({
            success: false,
            message: 'Email rate limit exceeded',
            retryAfter: result.retryAfter,
            tier: userTier
          });
        }
        
        next();
      } catch (error) {
        next(error);
      }
    };
  }

  /**
   * Job queue rate limiting middleware
   * @param {Object} options - Rate limiting options
   * @returns {Function} - Express middleware
   */
  jobRateLimit(options = {}) {
    const { points = 1 } = options;
    
    return async (req, res, next) => {
      try {
        const result = await this.checkRateLimit(req, this.jobLimiter, points);
        
        res.set({
          'X-RateLimit-Job-Limit': this.jobLimiter.points,
          'X-RateLimit-Job-Remaining': result.remainingPoints,
          'X-RateLimit-Job-Reset': new Date(Date.now() + result.msBeforeNext).toISOString()
        });
        
        if (!result.success) {
          res.set('Retry-After', result.retryAfter);
          return res.status(429).json({
            success: false,
            message: 'Job submission rate limit exceeded',
            retryAfter: result.retryAfter,
            tier: this.getUserTier(req)
          });
        }
        
        next();
      } catch (error) {
        next(error);
      }
    };
  }

  /**
   * Get user's current rate limit status
   * @param {Object} req - Express request object
   * @returns {Object} - Rate limit status
   */
  async getUserRateLimitStatus(req) {
    const userKey = this.getUserKey(req);
    const userTier = this.getUserTier(req);
    const limits = this.getLimitsForTier(userTier);
    
    try {
      // Get current status for each limiter
      const generalRes = await this.generalLimiter.get(userKey);
      const uploadRes = await this.uploadLimiter.get(userKey);
      const emailRes = await this.emailLimiter.get(userKey);
      const jobRes = await this.jobLimiter.get(userKey);
      
      return {
        userKey,
        tier: userTier,
        limits: {
          general: {
            limit: limits.maxRequests,
            remaining: generalRes ? generalRes.remainingPoints : limits.maxRequests,
            resetTime: generalRes ? new Date(Date.now() + generalRes.msBeforeNext).toISOString() : null
          },
          upload: {
            limit: limits.maxUploads,
            remaining: uploadRes ? uploadRes.remainingPoints : limits.maxUploads,
            resetTime: uploadRes ? new Date(Date.now() + uploadRes.msBeforeNext).toISOString() : null
          },
          email: {
            limit: limits.maxEmails,
            remaining: emailRes ? emailRes.remainingPoints : limits.maxEmails,
            resetTime: emailRes ? new Date(Date.now() + emailRes.msBeforeNext).toISOString() : null
          },
          jobs: {
            limit: this.jobLimiter.points,
            remaining: jobRes ? jobRes.remainingPoints : this.jobLimiter.points,
            resetTime: jobRes ? new Date(Date.now() + jobRes.msBeforeNext).toISOString() : null
          }
        }
      };
    } catch (error) {
      return {
        userKey,
        tier: userTier,
        error: error.message
      };
    }
  }

  /**
   * Reset rate limits for a user (admin only)
   * @param {string} userKey - User key to reset
   * @returns {Promise<boolean>} - Success status
   */
  async resetUserRateLimits(userKey) {
    try {
      await this.generalLimiter.delete(userKey);
      await this.uploadLimiter.delete(userKey);
      await this.emailLimiter.delete(userKey);
      await this.jobLimiter.delete(userKey);
      
      // Also clear from cache
      cacheService.delete(`user_tier:${userKey}`);
      
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Update user tier in cache
   * @param {string} userId - User ID
   * @param {string} tier - New tier
   */
  updateUserTier(userId, tier) {
    const cacheKey = `user_tier:user:${userId}`;
    cacheService.set(cacheKey, tier, 3600); // Cache for 1 hour
  }
}

module.exports = new UserRateLimiter();
