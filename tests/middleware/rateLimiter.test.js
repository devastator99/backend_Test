const request = require('supertest');
const express = require('express');
const { describe, it, expect, beforeEach, jest } = require('@jest/globals');
const {
  createRateLimitMiddleware,
  normalizeIpAddress,
} = require('../../src/middleware/rateLimiter');

describe('Rate Limiter Middleware', () => {
  let app;
  let limiter;

  beforeEach(() => {
    limiter = {
      points: 1,
      duration: 60,
      consume: jest.fn(),
    };

    app = express();
  });

  it('uses the first forwarded IP and normalizes IPv4-mapped addresses', async () => {
    limiter.consume.mockResolvedValue({
      remainingPoints: 0,
      msBeforeNext: 5000,
    });

    app.use(createRateLimitMiddleware(limiter));
    app.get('/test', (req, res) => res.json({ ok: true }));

    await request(app)
      .get('/test')
      .set('X-Forwarded-For', '203.0.113.9, 10.0.0.1')
      .expect(200);

    expect(limiter.consume).toHaveBeenCalledWith('ip:203.0.113.9');
    expect(normalizeIpAddress('::ffff:192.0.2.55')).toBe('192.0.2.55');
  });

  it('returns rate limit headers when the limit is exceeded', async () => {
    limiter.consume.mockRejectedValue({
      msBeforeNext: 3100,
      totalHits: 2,
    });

    app.use(createRateLimitMiddleware(limiter, {
      message: 'Too many requests. Please try again later.',
      includeDetails: true,
    }));
    app.get('/test', (req, res) => res.json({ ok: true }));

    const response = await request(app)
      .get('/test')
      .set('X-Real-IP', '::ffff:192.0.2.55')
      .expect(429);

    expect(limiter.consume).toHaveBeenCalledWith('ip:192.0.2.55');
    expect(response.headers['retry-after']).toBe('4');
    expect(response.headers['x-ratelimit-limit']).toBe('1');
    expect(response.headers['x-ratelimit-remaining']).toBe('0');
    expect(response.body).toMatchObject({
      success: false,
      message: 'Too many requests. Please try again later.',
      retryAfter: 4,
    });
    expect(response.body.details).toMatchObject({
      limit: 1,
      windowMs: 60000,
      retryAfterMs: 3100,
    });
  });
});
