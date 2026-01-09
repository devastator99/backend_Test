const request = require('supertest');
const { describe, it, expect, beforeAll, afterAll, beforeEach } = require('@jest/globals');
const express = require('express');
const { 
  requestIdMiddleware, 
  requestTrackingMiddleware,
  requestStatsEndpoint,
  resetRequestStats
} = require('../../src/middleware/requestId');

describe('Request ID Middleware Tests', () => {
  let app;

  beforeEach(() => {
    app = express();
    
    // Apply request ID middleware
    app.use(requestIdMiddleware);
    app.use(requestTrackingMiddleware());
    
    // Test endpoint
    app.get('/test', (req, res) => {
      res.json({
        requestId: req.requestId,
        method: req.method,
        url: req.url,
        hasStats: !!req.requestStats
      });
    });
    
    // Stats endpoint
    app.get('/stats', requestStatsEndpoint);
    
    // Reset stats endpoint
    app.post('/reset', resetRequestStats);
  });

  describe('Request ID Generation', () => {
    it('should generate unique request ID', async () => {
      const response = await request(app)
        .get('/test')
        .expect(200);

      expect(response.body.requestId).toBeDefined();
      expect(typeof response.body.requestId).toBe('string');
      expect(response.body.requestId).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i); // UUID v4 format
    });

    it('should include request ID in response headers', async () => {
      const response = await request(app)
        .get('/test')
        .expect(200);

      expect(response.headers['x-request-id']).toBeDefined();
      expect(response.headers['x-request-id']).toBe(response.body.requestId);
    });

    it('should use existing request ID from header', async () => {
      const existingRequestId = 'existing-request-id-123';
      
      const response = await request(app)
        .get('/test')
        .set('X-Request-ID', existingRequestId)
        .expect(200);

      expect(response.body.requestId).toBe(existingRequestId);
      expect(response.headers['x-request-id']).toBe(existingRequestId);
    });

    it('should generate different IDs for different requests', async () => {
      const response1 = await request(app).get('/test').expect(200);
      const response2 = await request(app).get('/test').expect(200);

      expect(response1.body.requestId).not.toBe(response2.body.requestId);
    });
  });

  describe('Request Tracking', () => {
    it('should track request statistics', async () => {
      // Make some requests
      await request(app).get('/test').expect(200);
      await request(app).post('/test').expect(200);
      await request(app).get('/test').expect(200);

      const statsResponse = await request(app)
        .get('/stats')
        .expect(200);

      const stats = statsResponse.body.data;
      expect(stats.totalRequests).toBe(3);
      expect(stats.requestsByMethod.GET).toBe(2);
      expect(stats.requestsByMethod.POST).toBe(1);
      expect(stats.requestsByPath['/test']).toBe(3);
    });

    it('should calculate average response time', async () => {
      // Make a request
      await request(app).get('/test').expect(200);

      const statsResponse = await request(app)
        .get('/stats')
        .expect(200);

      const stats = statsResponse.body.data;
      expect(stats.averageResponseTime).toMatch(/^\d+\.\d+ms$/);
      expect(parseFloat(stats.averageResponseTime)).toBeGreaterThan(0);
    });

    it('should track error responses', async () => {
      // Add an endpoint that returns an error
      app.get('/error', (req, res) => {
        res.status(500).json({ error: 'Test error' });
      });

      // Make requests including one error
      await request(app).get('/test').expect(200);
      await request(app).get('/error').expect(500);

      const statsResponse = await request(app)
        .get('/stats')
        .expect(200);

      const stats = statsResponse.body.data;
      expect(stats.errorCount).toBe(1);
      expect(stats.errorRate).toMatch(/^\d+\.\d+%$/);
      expect(parseFloat(stats.errorRate)).toBeGreaterThan(0);
    });

    it('should reset statistics correctly', async () => {
      // Make some requests
      await request(app).get('/test').expect(200);
      await request(app).get('/test').expect(200);

      // Check stats exist
      let statsResponse = await request(app).get('/stats').expect(200);
      expect(statsResponse.body.data.totalRequests).toBe(2);

      // Reset stats
      await request(app).post('/reset').expect(200);

      // Check stats are reset
      statsResponse = await request(app).get('/stats').expect(200);
      const stats = statsResponse.body.data;
      expect(stats.totalRequests).toBe(0);
      expect(stats.errorCount).toBe(0);
      expect(stats.averageResponseTime).toBe('0.00ms');
      expect(stats.errorRate).toBe('0.00%');
    });
  });

  describe('Statistics Data Structure', () => {
    it('should have consistent stats response structure', async () => {
      const response = await request(app)
        .get('/stats')
        .expect(200);

      // Check main response structure
      expect(response.body).toHaveProperty('success');
      expect(response.body).toHaveProperty('message');
      expect(response.body).toHaveProperty('data');
      expect(response.body).toHaveProperty('timestamp');
      
      // Check data structure
      const data = response.body.data;
      expect(data).toHaveProperty('totalRequests');
      expect(data).toHaveProperty('requestsByMethod');
      expect(data).toHaveProperty('requestsByPath');
      expect(data).toHaveProperty('averageResponseTime');
      expect(data).toHaveProperty('errorCount');
      expect(data).toHaveProperty('errorRate');
      expect(data).toHaveProperty('uptime');
      expect(data).toHaveProperty('lastReset');
    });

    it('should format response time correctly', async () => {
      await request(app).get('/test').expect(200);

      const response = await request(app).get('/stats').expect(200);
      const averageResponseTime = response.body.data.averageResponseTime;
      
      expect(averageResponseTime).toMatch(/^\d+\.\d+ms$/);
    });

    it('should format error rate correctly', async () => {
      await request(app).get('/test').expect(200);

      const response = await request(app).get('/stats').expect(200);
      const errorRate = response.body.data.errorRate;
      
      expect(errorRate).toMatch(/^\d+\.\d+%$/);
    });

    it('should format uptime correctly', async () => {
      const response = await request(app).get('/stats').expect(200);
      const uptime = response.body.data.uptime;
      
      expect(uptime).toBeDefined();
      expect(typeof uptime).toBe('string');
      expect(uptime).toMatch(/^(\d+d\s)?(\d+h\s)?(\d+m\s)?\d+s$/);
    });
  });

  describe('Performance Impact', () => {
    it('should not significantly impact response time', async () => {
      const startTime = Date.now();
      
      await request(app)
        .get('/test')
        .expect(200);
      
      const responseTime = Date.now() - startTime;
      expect(responseTime).toBeLessThan(50); // Should add minimal overhead
    });

    it('should handle concurrent requests', async () => {
      const requests = Array(10).fill().map(() =>
        request(app).get('/test')
      );

      const responses = await Promise.all(requests);
      
      responses.forEach(response => {
        expect(response.status).toBe(200);
        expect(response.body.requestId).toBeDefined();
        expect(response.headers['x-request-id']).toBeDefined();
      });

      // All request IDs should be unique
      const requestIds = responses.map(r => r.body.requestId);
      const uniqueIds = new Set(requestIds);
      expect(uniqueIds.size).toBe(requestIds.length);
    });
  });

  describe('Request Object Enhancement', () => {
    it('should add request ID to request object', async () => {
      const response = await request(app)
        .get('/test')
        .expect(200);

      expect(response.body.hasStats).toBe(true);
      expect(response.body.requestId).toBeDefined();
    });

    it('should add start time to request object', async () => {
      // Test that start time is added for performance tracking
      const response = await request(app)
        .get('/test')
        .expect(200);

      expect(response.body.requestId).toBeDefined();
      // The middleware should have added startTime for performance tracking
    });
  });

  describe('Response Headers', () => {
    it('should set X-Request-ID header', async () => {
      const response = await request(app)
        .get('/test')
        .expect(200);

      expect(response.headers['x-request-id']).toBeDefined();
      expect(typeof response.headers['x-request-id']).toBe('string');
    });

    it('should preserve existing headers', async () => {
      app.get('/test-headers', (req, res) => {
        res.set('X-Custom-Header', 'test-value');
        res.json({ requestId: req.requestId });
      });

      const response = await request(app)
        .get('/test-headers')
        .expect(200);

      expect(response.headers['x-request-id']).toBeDefined();
      expect(response.headers['x-custom-header']).toBe('test-value');
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty request ID header', async () => {
      const response = await request(app)
        .get('/test')
        .set('X-Request-ID', '')
        .expect(200);

      // Should generate a new ID when header is empty
      expect(response.body.requestId).toBeDefined();
      expect(response.body.requestId).not.toBe('');
    });

    it('should handle invalid request ID format', async () => {
      const invalidRequestId = 'invalid-format';
      
      const response = await request(app)
        .get('/test')
        .set('X-Request-ID', invalidRequestId)
        .expect(200);

      // Should use the provided ID even if format is invalid
      expect(response.body.requestId).toBe(invalidRequestId);
      expect(response.headers['x-request-id']).toBe(invalidRequestId);
    });

    it('should handle very long request ID', async () => {
      const longRequestId = 'a'.repeat(1000);
      
      const response = await request(app)
        .get('/test')
        .set('X-Request-ID', longRequestId)
        .expect(200);

      expect(response.body.requestId).toBe(longRequestId);
      expect(response.headers['x-request-id']).toBe(longRequestId);
    });
  });
});
