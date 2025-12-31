const { RateLimiterMemory, RateLimiterRedis } = require('rate-limiter-flexible');
const Redis = require('ioredis');
const { securityLogger } = require('../utils/logger');
const { TooManyRequestsError } = require('../utils/errors');

const redisClient = process.env.REDIS_URL 
  ? new Redis(process.env.REDIS_URL, {
      retryDelayOnFailover: 100,
      maxRetriesPerRequest: 3,
      lazyConnect: true,
    })
  : null;

const rateLimiterOptions = {
  keyGenerator: (req) => {
    const userId = req.user?.id;
    const ip = req.ip || req.connection.remoteAddress;
    return userId ? `user:${userId}` : `ip:${ip}`;
  },
  points: 100,
  duration: 60,
  blockDuration: 60,
};

const rateLimiter = redisClient 
  ? new RateLimiterRedis({
      ...rateLimiterOptions,
      storeClient: redisClient,
      redisOptions: {
        enableOfflineQueue: false,
      },
    })
  : new RateLimiterMemory(rateLimiterOptions);

const authRateLimiter = new RateLimiterMemory({
  keyGenerator: (req) => req.ip,
  points: 5,
  duration: 900, // 15 minutes
  blockDuration: 900,
});

const uploadRateLimiter = new RateLimiterMemory({
  keyGenerator: (req) => {
    const userId = req.user?.id;
    return userId ? `upload:${userId}` : `upload:${req.ip}`;
  },
  points: 10,
  duration: 3600, // 1 hour
  blockDuration: 3600,
});

const sensitiveRateLimiter = new RateLimiterMemory({
  keyGenerator: (req) => {
    const userId = req.user?.id;
    return userId ? `sensitive:${userId}` : `sensitive:${req.ip}`;
  },
  points: 3,
  duration: 1800, // 30 minutes
  blockDuration: 1800,
});

const createRateLimitMiddleware = (limiter, options = {}) => {
  return async (req, res, next) => {
    try {
      const key = limiter.keyGenerator(req);
      const result = await limiter.consume(key);
      
      res.set({
        'X-RateLimit-Limit': limiter.points,
        'X-RateLimit-Remaining': result.remainingPoints,
        'X-RateLimit-Reset': new Date(Date.now() + result.msBeforeNext).toISOString(),
      });
      
      next();
    } catch (rejRes) {
      const secs = Math.round(rejRes.msBeforeNext / 1000) || 1;
      
      res.set({
        'Retry-After': String(secs),
        'X-RateLimit-Limit': limiter.points,
        'X-RateLimit-Remaining': '0',
        'X-RateLimit-Reset': new Date(Date.now() + rejRes.msBeforeNext).toISOString(),
      });
      
      const key = limiter.keyGenerator(req);
      securityLogger.logRateLimitExceeded(req.ip, req.originalUrl);
      
      if (options.logSuspicious) {
        securityLogger.logSuspiciousActivity('Rate limit exceeded', {
          ip: req.ip,
          endpoint: req.originalUrl,
          method: req.method,
          userAgent: req.get('User-Agent'),
          key,
        });
      }
      
      const errorResponse = {
        success: false,
        message: options.message || 'Too many requests',
        retryAfter: secs,
        timestamp: new Date().toISOString(),
      };
      
      if (options.includeDetails) {
        errorResponse.details = {
          limit: limiter.points,
          windowMs: limiter.duration * 1000,
          retryAfterMs: rejRes.msBeforeNext,
        };
      }
      
      res.status(429).json(errorResponse);
    }
  };
};

const rateLimitMiddleware = createRateLimitMiddleware(rateLimiter, {
  message: 'Too many requests. Please try again later.',
  includeDetails: false,
});

const authRateLimitMiddleware = createRateLimitMiddleware(authRateLimiter, {
  message: 'Too many authentication attempts. Please try again later.',
  includeDetails: true,
  logSuspicious: true,
});

const uploadRateLimitMiddleware = createRateLimitMiddleware(uploadRateLimiter, {
  message: 'Upload limit exceeded. Please try again later.',
  includeDetails: true,
});

const sensitiveRateLimitMiddleware = createRateLimitMiddleware(sensitiveRateLimiter, {
  message: 'Too many sensitive operations. Please try again later.',
  includeDetails: true,
  logSuspicious: true,
});

const createCustomRateLimiter = (options) => {
  const limiter = redisClient 
    ? new RateLimiterRedis({
        ...rateLimiterOptions,
        ...options,
        storeClient: redisClient,
        redisOptions: {
          enableOfflineQueue: false,
        },
      })
    : new RateLimiterMemory({
        ...rateLimiterOptions,
        ...options,
      });
  
  return createRateLimitMiddleware(limiter, options.middlewareOptions || {});
};

const getRateLimitStatus = async (key, limiter = rateLimiter) => {
  try {
    const res = await limiter.get(key);
    return {
      remainingPoints: res?.remainingPoints || limiter.points,
      msBeforeNext: res?.msBeforeNext || 0,
    };
  } catch (error) {
    return {
      remainingPoints: limiter.points,
      msBeforeNext: 0,
    };
  }
};

const resetRateLimit = async (key, limiter = rateLimiter) => {
  try {
    await limiter.delete(key);
    return true;
  } catch (error) {
    console.error('Failed to reset rate limit:', error);
    return false;
  }
};

const rateLimitMiddlewareWithUser = (req, res, next) => {
  if (req.user) {
    return rateLimitMiddleware(req, res, next);
  } else {
    return createRateLimitMiddleware(new RateLimiterMemory({
      keyGenerator: (req) => req.ip,
      points: 50,
      duration: 60,
      blockDuration: 60,
    }))(req, res, next);
  }
};

process.on('SIGTERM', async () => {
  if (redisClient) {
    await redisClient.quit();
  }
});

process.on('SIGINT', async () => {
  if (redisClient) {
    await redisClient.quit();
  }
});

module.exports = {
  rateLimitMiddleware,
  authRateLimitMiddleware,
  uploadRateLimitMiddleware,
  sensitiveRateLimitMiddleware,
  rateLimitMiddlewareWithUser,
  createCustomRateLimiter,
  getRateLimitStatus,
  resetRateLimit,
  rateLimiter,
  authRateLimiter,
  uploadRateLimiter,
  sensitiveRateLimiter,
};
