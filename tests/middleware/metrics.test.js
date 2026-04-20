const request = require('supertest');
const express = require('express');
const { describe, it, expect, beforeAll } = require('@jest/globals');
const {
  metricsMiddleware,
  metricsHandler,
  normalizeRoute,
  metricsEnabled,
} = require('../../src/utils/metrics');

describe('Metrics Middleware', () => {
  let app;

  beforeAll(() => {
    app = express();
    app.use(express.json());
    app.use(metricsMiddleware);

    app.get('/users/:id', (req, res) => {
      res.json({ ok: true });
    });

    app.get('/metrics', metricsHandler);
  });

  it('normalizes dynamic routes for metrics labels', () => {
    expect(normalizeRoute({ originalUrl: '/api/users/123' })).toBe('/api/users/:id');
    expect(normalizeRoute({ originalUrl: '/api/jobs/550e8400-e29b-41d4-a716-446655440000' })).toBe('/api/jobs/:id');
  });

  it('exposes Prometheus metrics in text format', async () => {
    const response = await request(app)
      .get('/users/123')
      .expect(200);

    expect(response.body.ok).toBe(true);

    const metricsResponse = await request(app)
      .get('/metrics')
      .expect(200);

    expect(metricsResponse.headers['content-type']).toContain('text/plain');

    if (metricsEnabled) {
      expect(metricsResponse.text).toContain('app_http_requests_total');
      expect(metricsResponse.text).toContain('app_http_request_duration_seconds');
      expect(metricsResponse.text).toContain('app_http_in_flight_requests');
    } else {
      expect(metricsResponse.text).toContain('Prometheus metrics are disabled');
    }
  });
});
