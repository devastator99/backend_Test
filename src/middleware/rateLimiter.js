const { RateLimiterMemory } = require('rate-limiter-flexible');

const rateLimiter = new RateLimiterMemory({
  keyGenerator: (req) => req.ip,
  points: 100,
  duration: 60,
});

const rateLimitMiddleware = async (req, res, next) => {
  try {
    await rateLimiter.consume(req.ip);
    next();
  } catch (rejRes) {
    const secs = Math.round(rejRes.msBeforeNext / 1000) || 1;
    res.set('Retry-After', String(secs));
    res.status(429).json({
      success: false,
      message: 'Too many requests',
      retryAfter: secs,
    });
  }
};

module.exports = rateLimitMiddleware;
