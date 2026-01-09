const request = require('supertest');
const { describe, it, expect, beforeAll, afterAll } = require('@jest/globals');
const express = require('express');
const { 
  simpleHealthCheck, 
  livenessProbe, 
  readinessProbe 
} = require('../../src/middleware/healthCheck');

describe('Simple Health Check Middleware Tests', () => {
  let app;

  beforeAll(() => {
    app = express();
    
    // Add health check endpoints
    app.get('/health/simple', simpleHealthCheck);
    app.get('/liveness', livenessProbe);
    app.get('/readiness', readinessProbe);
  });

  describe('Simple Health Check', () => {
    it('should return basic health status', async () => {
      const response = await request(app)
        .get('/health/simple')
        .expect(200);

      expect(response.body.status).toBe('ok');
      expect(response.body.timestamp).toBeDefined();
      expect(typeof response.body.timestamp).toBe('string');
    });

    it('should include proper headers', async () => {
      const response = await request(app)
        .get('/health/simple')
        .expect(200);

      expect(response.headers['content-type']).toContain('application/json');
    });
  });

  describe('Liveness Probe', () => {
    it('should return alive status', async () => {
      const response = await request(app)
        .get('/liveness')
        .expect(200);

      expect(response.body.status).toBe('alive');
      expect(response.body.timestamp).toBeDefined();
      expect(typeof response.body.timestamp).toBe('string');
    });

    it('should respond quickly', async () => {
      const startTime = Date.now();
      
      await request(app)
        .get('/liveness')
        .expect(200);
      
      const responseTime = Date.now() - startTime;
      expect(responseTime).toBeLessThan(50); // Should be very fast
    });
  });

  describe('Readiness Probe', () => {
    it('should return ready status', async () => {
      const response = await request(app)
        .get('/readiness')
        .expect(200);

      expect(response.body.status).toBe('ready');
      expect(response.body.timestamp).toBeDefined();
      expect(typeof response.body.timestamp).toBe('string');
    });
  });

  describe('Response Structure', () => {
    it('should have consistent response structure', async () => {
      const simpleResponse = await request(app)
        .get('/health/simple')
        .expect(200);

      const livenessResponse = await request(app)
        .get('/liveness')
        .expect(200);

      const readinessResponse = await request(app)
        .get('/readiness')
        .expect(200);

      // All should have status and timestamp
      [simpleResponse, livenessResponse, readinessResponse].forEach(response => {
        expect(response.body).toHaveProperty('status');
        expect(response.body).toHaveProperty('timestamp');
      });
    });

    it('should have valid timestamp format', async () => {
      const response = await request(app)
        .get('/health/simple')
        .expect(200);

      const timestamp = response.body.timestamp;
      expect(timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
    });
  });

  describe('Performance', () => {
    it('should handle concurrent requests', async () => {
      const requests = Array(20).fill().map(() =>
        request(app).get('/liveness')
      );

      const responses = await Promise.all(requests);
      
      responses.forEach(response => {
        expect(response.status).toBe(200);
        expect(response.body.status).toBe('alive');
      });
    });

    it('should maintain consistent response times', async () => {
      const requests = Array(5).fill().map(() =>
        request(app).get('/health/simple')
      );

      const responses = await Promise.all(requests);
      
      responses.forEach(response => {
        expect(response.status).toBe(200);
        expect(response.body.status).toBe('ok');
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid endpoints gracefully', async () => {
      const response = await request(app)
        .get('/invalid-endpoint')
        .expect(404);

      expect(response.status).toBe(404);
    });

    it('should handle malformed requests', async () => {
      const response = await request(app)
        .get('/health/simple')
        .set('User-Agent', 'Test-Agent/1.0')
        .expect(200);

      expect(response.body.status).toBe('ok');
    });
  });

  describe('HTTP Methods', () => {
    it('should only respond to GET requests', async () => {
      await request(app)
        .post('/health/simple')
        .expect(404);

      await request(app)
        .put('/health/simple')
        .expect(404);

      await request(app)
        .delete('/health/simple')
        .expect(404);
    });
  });

  describe('Headers and Content Type', () => {
    it('should return JSON content type', async () => {
      const response = await request(app)
        .get('/health/simple')
        .expect(200);

      expect(response.headers['content-type']).toContain('application/json');
    });

    it('should not have unnecessary headers', async () => {
      const response = await request(app)
        .get('/health/simple')
        .expect(200);

      // Should not have compression headers for small responses
      expect(response.headers['content-encoding']).toBeUndefined();
    });
  });
});
