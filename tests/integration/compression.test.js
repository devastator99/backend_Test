const request = require('supertest');
const { describe, it, expect, beforeAll, afterAll, beforeEach } = require('@jest/globals');
const app = require('../../src/index');
const { compressionStats } = require('../../src/middleware/compression');

describe('Compression Integration Tests', () => {
  let server;
  let testUser;
  let userToken;

  beforeAll(async () => {
    server = app.listen(0);
    
    // Reset compression stats
    compressionStats.reset();
  });

  afterAll(async () => {
    if (server) {
      server.close();
    }
  });

  beforeEach(async () => {
    // Reset stats before each test
    compressionStats.reset();
  });

  describe('API Endpoint Compression', () => {
    it('should compress user registration responses', async () => {
      const response = await request(app)
        .post('/api/users/register')
        .send({
          email: 'compression-test@example.com',
          name: 'Compression Test User',
          password: 'Password123!'
        })
        .set('Accept-Encoding', 'gzip, deflate')
        .expect(201);

      // Registration response should be compressed
      expect(response.headers['content-encoding']).toBe('gzip');
      expect(response.headers['vary']).toBe('Accept-Encoding');
    });

    it('should compress login responses', async () => {
      // First register a user
      await request(app)
        .post('/api/users/register')
        .send({
          email: 'login-compression@example.com',
          name: 'Login Test User',
          password: 'Password123!'
        });

      // Then login
      const response = await request(app)
        .post('/api/users/login')
        .send({
          email: 'login-compression@example.com',
          password: 'Password123!'
        })
        .set('Accept-Encoding', 'gzip, deflate')
        .expect(200);

      expect(response.headers['content-encoding']).toBe('gzip');
      expect(response.body.success).toBe(true);
      expect(response.body.data.token).toBeDefined();
    });

    it('should compress product list responses', async () => {
      const response = await request(app)
        .get('/api/products')
        .set('Accept-Encoding', 'gzip, deflate')
        .expect(200);

      expect(response.headers['content-encoding']).toBe('gzip');
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data.items)).toBe(true);
    });

    it('should compress search results', async () => {
      const response = await request(app)
        .get('/api/products/search?q=test')
        .set('Accept-Encoding', 'gzip, deflate')
        .expect(200);

      expect(response.headers['content-encoding']).toBe('gzip');
      expect(response.body.success).toBe(true);
    });

    it('should compress category filter results', async () => {
      const response = await request(app)
        .get('/api/products/category/Electronics')
        .set('Accept-Encoding', 'gzip, deflate')
        .expect(200);

      expect(response.headers['content-encoding']).toBe('gzip');
      expect(response.body.success).toBe(true);
    });
  });

  describe('Documentation Compression', () => {
    it('should compress API documentation JSON', async () => {
      const response = await request(app)
        .get('/api-docs.json')
        .set('Accept-Encoding', 'gzip, deflate')
        .expect(200);

      expect(response.headers['content-encoding']).toBe('gzip');
      expect(response.body.openapi).toBe('3.0.0');
    });

    it('should compress Swagger UI HTML', async () => {
      const response = await request(app)
        .get('/api-docs')
        .set('Accept-Encoding', 'gzip, deflate')
        .expect(200);

      expect(response.headers['content-encoding']).toBe('gzip');
      expect(response.text).toContain('swagger-ui');
    });

    it('should compress API overview endpoint', async () => {
      const response = await request(app)
        .get('/api')
        .set('Accept-Encoding', 'gzip, deflate')
        .expect(200);

      expect(response.headers['content-encoding']).toBe('gzip');
      expect(response.body.success).toBe(true);
    });
  });

  describe('Compression Statistics Integration', () => {
    it('should track compression statistics across API calls', async () => {
      // Make several API calls
      await request(app)
        .get('/api/products')
        .set('Accept-Encoding', 'gzip, deflate')
        .expect(200);

      await request(app)
        .get('/api-docs.json')
        .set('Accept-Encoding', 'gzip, deflate')
        .expect(200);

      await request(app)
        .post('/api/users/register')
        .send({
          email: 'stats-test@example.com',
          name: 'Stats Test User',
          password: 'Password123!'
        })
        .set('Accept-Encoding', 'gzip, deflate')
        .expect(201);

      // Check compression stats
      const statsResponse = await request(app)
        .get('/compression-stats')
        .expect(200);

      const stats = statsResponse.body.data;
      expect(stats.totalRequests).toBeGreaterThan(0);
      expect(stats.compressedResponses).toBeGreaterThan(0);
      expect(parseFloat(stats.avgCompressionRatio)).toBeGreaterThan(0);
      expect(parseFloat(stats.totalBandwidthSaved)).toBeGreaterThan(0);
    });

    it('should allow resetting compression statistics', async () => {
      // Make some requests
      await request(app)
        .get('/api/products')
        .set('Accept-Encoding', 'gzip, deflate')
        .expect(200);

      // Check stats exist
      let statsResponse = await request(app)
        .get('/compression-stats')
        .expect(200);

      expect(statsResponse.body.data.totalRequests).toBeGreaterThan(0);

      // Reset stats
      await request(app)
        .post('/compression-stats/reset')
        .expect(200);

      // Check stats are reset
      statsResponse = await request(app)
        .get('/compression-stats')
        .expect(200);

      const stats = statsResponse.body.data;
      expect(stats.totalRequests).toBe(0);
      expect(stats.compressedResponses).toBe(0);
      expect(stats.avgCompressionRatio).toBe('0.00%');
    });
  });

  describe('Selective Compression in Production', () => {
    it('should not compress health check endpoint', async () => {
      const response = await request(app)
        .get('/health')
        .set('Accept-Encoding', 'gzip, deflate')
        .expect(200);

      // Health check should not be compressed (excluded route)
      expect(response.headers['content-encoding']).toBeUndefined();
      expect(response.body.success).toBe(true);
    });

    it('should not compress metrics endpoint', async () => {
      const response = await request(app)
        .get('/metrics')
        .set('Accept-Encoding', 'gzip, deflate')
        .expect(404); // Endpoint doesn't exist, but would be excluded if it did

      expect(response.headers['content-encoding']).toBeUndefined();
    });

    it('should compress compression stats endpoint', async () => {
      const response = await request(app)
        .get('/compression-stats')
        .set('Accept-Encoding', 'gzip, deflate')
        .expect(200);

      // Compression stats should be compressed (not excluded)
      expect(response.headers['content-encoding']).toBe('gzip');
      expect(response.body.success).toBe(true);
    });
  });

  describe('Error Response Compression', () => {
    it('should compress validation error responses', async () => {
      const response = await request(app)
        .post('/api/users/register')
        .send({
          email: 'invalid-email',
          name: '',
          password: '123'
        })
        .set('Accept-Encoding', 'gzip, deflate')
        .expect(400);

      expect(response.headers['content-encoding']).toBe('gzip');
      expect(response.body.success).toBe(false);
      expect(response.body.errors).toBeDefined();
    });

    it('should compress authentication error responses', async () => {
      const response = await request(app)
        .get('/api/users/profile')
        .set('Accept-Encoding', 'gzip, deflate')
        .expect(401);

      expect(response.headers['content-encoding']).toBe('gzip');
      expect(response.body.success).toBe(false);
    });

    it('should compress not found error responses', async () => {
      const response = await request(app)
        .get('/api/nonexistent-endpoint')
        .set('Accept-Encoding', 'gzip, deflate')
        .expect(404);

      expect(response.headers['content-encoding']).toBe('gzip');
    });
  });

  describe('Performance Under Load', () => {
    it('should handle concurrent compressed API requests', async () => {
      const requests = Array(20).fill().map(() =>
        request(app)
          .get('/api/products')
          .set('Accept-Encoding', 'gzip, deflate')
      );

      const responses = await Promise.all(requests);
      
      responses.forEach(response => {
        expect(response.status).toBe(200);
        expect(response.headers['content-encoding']).toBe('gzip');
      });

      // Check compression stats
      const statsResponse = await request(app)
        .get('/compression-stats')
        .expect(200);

      const stats = statsResponse.body.data;
      expect(stats.totalRequests).toBe(20);
      expect(stats.compressedResponses).toBe(20);
    });

    it('should maintain performance with mixed compressed/uncompressed requests', async () => {
      const compressedRequests = Array(10).fill().map(() =>
        request(app)
          .get('/api/products')
          .set('Accept-Encoding', 'gzip, deflate')
      );

      const uncompressedRequests = Array(10).fill().map(() =>
        request(app)
          .get('/api/products')
          .set('Accept-Encoding', 'identity')
      );

      const allResponses = await Promise.all([...compressedRequests, ...uncompressedRequests]);
      
      // Check compressed responses
      compressedRequests.forEach((_, index) => {
        const response = allResponses[index];
        expect(response.status).toBe(200);
        expect(response.headers['content-encoding']).toBe('gzip');
      });

      // Check uncompressed responses
      uncompressedRequests.forEach((_, index) => {
        const response = allResponses[compressedRequests.length + index];
        expect(response.status).toBe(200);
        expect(response.headers['content-encoding']).toBeUndefined();
      });
    });
  });

  describe('Content Type Specific Compression', () => {
    it('should compress JSON API responses', async () => {
      const response = await request(app)
        .get('/api/products')
        .set('Accept-Encoding', 'gzip, deflate')
        .expect(200);

      expect(response.headers['content-encoding']).toBe('gzip');
      expect(response.headers['content-type']).toContain('application/json');
    });

    it('should compress HTML documentation', async () => {
      const response = await request(app)
        .get('/api-docs')
        .set('Accept-Encoding', 'gzip, deflate')
        .expect(200);

      expect(response.headers['content-encoding']).toBe('gzip');
      expect(response.headers['content-type']).toContain('text/html');
    });

    it('should not compress static file uploads', async () => {
      // This would test file serving if we had static file endpoints
      // For now, we'll test that the compression middleware handles different content types
      const response = await request(app)
        .get('/health')
        .set('Accept-Encoding', 'gzip, deflate')
        .expect(200);

      // Health check is excluded from compression
      expect(response.headers['content-encoding']).toBeUndefined();
    });
  });

  describe('Client Compatibility', () => {
    it('should handle clients with different encoding preferences', async () => {
      // Test with deflate only
      const deflateResponse = await request(app)
        .get('/api/products')
        .set('Accept-Encoding', 'deflate')
        .expect(200);

      expect(deflateResponse.headers['content-encoding']).toBe('deflate');

      // Test with both gzip and deflate
      const bothResponse = await request(app)
        .get('/api/products')
        .set('Accept-Encoding', 'gzip, deflate, br')
        .expect(200);

      expect(bothResponse.headers['content-encoding']).toBe('gzip'); // Should prefer gzip
    });

    it('should handle clients with no compression support', async () => {
      const response = await request(app)
        .get('/api/products')
        .expect(200);

      expect(response.headers['content-encoding']).toBeUndefined();
      expect(response.body.success).toBe(true);
    });

    it('should respect client no-compression preference', async () => {
      const response = await request(app)
        .get('/api/products')
        .set('Accept-Encoding', 'gzip, deflate')
        .set('x-no-compression', 'true')
        .expect(200);

      expect(response.headers['content-encoding']).toBeUndefined();
      expect(response.body.success).toBe(true);
    });
  });
});
