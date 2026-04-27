const { RateLimiterMemory, RateLimiterRedis } = require('rate-limiter-flexible');
const Redis = require('ioredis');
const { securityLogger } = require('../utils/logger');

const redisClient = process.env.REDIS_URL 
  ? new Redis(process.env.REDIS_URL, {
      retryDelayOnFailover: 100,
      maxRetriesPerRequest: 3,
      lazyConnect: true,
    })
  : null;

const EXCLUDED_RATE_LIMIT_PATHS = new Set([
  '/health',
  '/metrics',
  '/status',
  '/liveness',
  '/readiness',
  '/live',
  '/ready',
]);

const rateLimiterOptions = {
  points: 100,
  duration: 60,
  blockDuration: 60,
};

const normalizeIpAddress = (ip) => {
  if (!ip || typeof ip !== 'string') {
    return 'unknown';
  }

  const trimmed = ip.trim();
  return trimmed.startsWith('::ffff:') ? trimmed.slice(7) : trimmed;
};

const getClientIp = (req) => {
  const forwardedFor = req.headers?.['x-forwarded-for'];
  if (typeof forwardedFor === 'string' && forwardedFor.trim()) {
    return normalizeIpAddress(forwardedFor.split(',')[0]);
  }

  const realIp = req.headers?.['x-real-ip'];
  if (typeof realIp === 'string' && realIp.trim()) {
    return normalizeIpAddress(realIp);
  }

  return normalizeIpAddress(
    req.ip ||
    req.socket?.remoteAddress ||
    req.connection?.remoteAddress ||
    'unknown'
  );
};

const defaultKeyGenerator = (req) => {
  const userId = req.user?.id;
  const clientIp = getClientIp(req);

  return userId ? `user:${userId}` : `ip:${clientIp}`;
};

const formatResetHeader = (msBeforeNext) => {
  const delayMs = Number.isFinite(msBeforeNext) ? Math.max(0, msBeforeNext) : 0;
  return new Date(Date.now() + delayMs).toISOString();
};

const buildLimiter = (options = {}) => {
  const limiterOptions = {
    ...rateLimiterOptions,
    ...options,
  };

  if (redisClient) {
    return new RateLimiterRedis({
      ...limiterOptions,
      storeClient: redisClient,
      redisOptions: {
        enableOfflineQueue: false,
      },
    });
  }

  return new RateLimiterMemory(limiterOptions);
};

const rateLimiter = buildLimiter();

const authRateLimiter = new RateLimiterMemory({
  points: 5,
  duration: 900, // 15 minutes
  blockDuration: 900,
});

const uploadRateLimiter = new RateLimiterMemory({
  points: 10,
  duration: 3600, // 1 hour
  blockDuration: 3600,
});

const sensitiveRateLimiter = new RateLimiterMemory({
  points: 3,
  duration: 1800, // 30 minutes
  blockDuration: 1800,
});

const createRateLimitMiddleware = (limiter, options = {}) => {
  const keyGenerator = options.keyGenerator || defaultKeyGenerator;
  const excludedPaths = new Set([
    ...EXCLUDED_RATE_LIMIT_PATHS,
    ...(options.excludePaths || []),
  ]);

  const keyForRequest = (req) => {
    try {
      return keyGenerator(req);
    } catch (error) {
      return `ip:${getClientIp(req)}`;
    }
  };

  return async (req, res, next) => {
    const path = (req.originalUrl || req.path || '').split('?')[0];
    if (excludedPaths.has(path)) {
      return next();
    }

    try {
      const key = keyForRequest(req);
      const result = await limiter.consume(key);
      const limit = limiter.points ?? options.points ?? 0;
      
      res.set({
        'X-RateLimit-Limit': limit,
        'X-RateLimit-Remaining': result.remainingPoints,
        'X-RateLimit-Reset': formatResetHeader(result.msBeforeNext),
      });
      
      next();
    } catch (rejRes) {
      const secs = Math.max(1, Math.ceil((rejRes?.msBeforeNext || 0) / 1000));
      const limit = limiter.points ?? options.points ?? 0;
      
      res.set({
        'Retry-After': String(secs),
        'X-RateLimit-Limit': limit,
        'X-RateLimit-Remaining': '0',
        'X-RateLimit-Reset': formatResetHeader(rejRes?.msBeforeNext),
      });
      
      const key = keyForRequest(req);
      const clientIp = getClientIp(req);
      securityLogger.logRateLimitExceeded(clientIp, req.originalUrl);
      
      if (options.logSuspicious) {
        securityLogger.logSuspiciousActivity('Rate limit exceeded', {
          ip: clientIp,
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
          limit,
          windowMs: limiter.duration * 1000,
          retryAfterMs: rejRes?.msBeforeNext || 0,
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
  keyGenerator: (req) => `ip:${getClientIp(req)}`,
  message: 'Too many authentication attempts. Please try again later.',
  includeDetails: true,
  logSuspicious: true,
});

const uploadRateLimitMiddleware = createRateLimitMiddleware(uploadRateLimiter, {
  keyGenerator: (req) => {
    const userId = req.user?.id;
    return userId ? `upload:${userId}` : `upload:${getClientIp(req)}`;
  },
  message: 'Upload limit exceeded. Please try again later.',
  includeDetails: true,
});

const sensitiveRateLimitMiddleware = createRateLimitMiddleware(sensitiveRateLimiter, {
  keyGenerator: (req) => {
    const userId = req.user?.id;
    return userId ? `sensitive:${userId}` : `sensitive:${getClientIp(req)}`;
  },
  message: 'Too many sensitive operations. Please try again later.',
  includeDetails: true,
  logSuspicious: true,
});

const createCustomRateLimiter = (options) => {
  const { middlewareOptions = {}, ...limiterOptions } = options || {};
  const limiter = buildLimiter(limiterOptions);
  
  return createRateLimitMiddleware(limiter, {
    keyGenerator: limiterOptions.keyGenerator || defaultKeyGenerator,
    excludePaths: limiterOptions.excludePaths || [],
    ...middlewareOptions,
  });
};

const getRateLimitStatus = async (key, limiter = rateLimiter) => {
  try {
    const res = await limiter.get(key);
    return {
      remainingPoints: res?.remainingPoints ?? limiter.points,
      msBeforeNext: res?.msBeforeNext ?? 0,
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

const anonymousRateLimiter = new RateLimiterMemory({
  points: 50,
  duration: 60,
  blockDuration: 60,
});

const anonymousRateLimitMiddleware = createRateLimitMiddleware(anonymousRateLimiter, {
  keyGenerator: (req) => `ip:${getClientIp(req)}`,
});

const rateLimitMiddlewareWithUser = (req, res, next) => {
  if (req.user) {
    return rateLimitMiddleware(req, res, next);
  }

  return anonymousRateLimitMiddleware(req, res, next);
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
  createRateLimitMiddleware,
  getClientIp,
  normalizeIpAddress,
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
