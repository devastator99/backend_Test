const request = require('supertest');
const { describe, it, expect, beforeAll, afterAll, beforeEach } = require('@jest/globals');
const express = require('express');
const { v4: uuidv4 } = require('uuid');

describe('Request ID Middleware Simple Tests', () => {
  let app;

  beforeEach(() => {
    app = express();
    
    // Simple request ID middleware
    app.use((req, res, next) => {
      const requestId = req.headers['x-request-id'] || uuidv4();
      req.requestId = requestId;
      res.setHeader('X-Request-ID', requestId);
      next();
    });
    
    // Test endpoint that handles all methods
    app.all('/test', (req, res) => {
      res.json({
        requestId: req.requestId,
        method: req.method,
        url: req.url
      });
    });
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

      // Should use provided ID even if format is invalid
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

  describe('Performance', () => {
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

  describe('Response Structure', () => {
    it('should maintain response structure', async () => {
      const response = await request(app)
        .get('/test')
        .expect(200);

      expect(response.body).toHaveProperty('requestId');
      expect(response.body).toHaveProperty('method');
      expect(response.body).toHaveProperty('url');
      expect(response.body.method).toBe('GET');
      expect(response.body.url).toBe('/test');
    });
  });

  describe('HTTP Methods', () => {
    it('should work with different HTTP methods', async () => {
      // Test POST
      const postResponse = await request(app)
        .post('/test')
        .expect(200);

      expect(postResponse.body.requestId).toBeDefined();
      expect(postResponse.headers['x-request-id']).toBeDefined();

      // Test PUT
      const putResponse = await request(app)
        .put('/test')
        .expect(200);

      expect(putResponse.body.requestId).toBeDefined();
      expect(putResponse.headers['x-request-id']).toBeDefined();

      // Test DELETE
      const deleteResponse = await request(app)
        .delete('/test')
        .expect(200);

      expect(deleteResponse.body.requestId).toBeDefined();
      expect(deleteResponse.headers['x-request-id']).toBeDefined();
    });
  });

  describe('Content Type', () => {
    it('should work with different content types', async () => {
      // JSON response
      const jsonResponse = await request(app)
        .get('/test')
        .expect(200);

      expect(jsonResponse.headers['content-type']).toContain('application/json');
      expect(jsonResponse.headers['x-request-id']).toBeDefined();

      // Text response
      app.get('/text', (req, res) => {
        res.set('Content-Type', 'text/plain');
        res.send(`Request ID: ${req.requestId}`);
      });

      const textResponse = await request(app)
        .get('/text')
        .expect(200);

      expect(textResponse.headers['content-type']).toContain('text/plain');
      expect(textResponse.headers['x-request-id']).toBeDefined();
    });
  });
});
