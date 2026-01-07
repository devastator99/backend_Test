const request = require('supertest');
const { describe, it, expect, beforeAll, afterAll, beforeEach } = require('@jest/globals');
const express = require('express');
const { 
  compressionWithLogging, 
  selectiveCompression, 
  compressionStats,
  compressionHeaders 
} = require('../../src/middleware/compression');

describe('Compression Middleware Tests', () => {
  let app;
  let server;

  beforeAll(() => {
    // Reset compression stats before tests
    compressionStats.reset();
  });

  beforeEach(() => {
    app = express();
    
    // Add compression headers middleware
    app.use(compressionHeaders);
    
    // Apply compression middleware
    app.use(compressionWithLogging);
    
    // Test endpoint that returns JSON
    app.get('/test-json', (req, res) => {
      res.json({
        data: 'x'.repeat(2000), // Large enough to trigger compression
        timestamp: new Date().toISOString()
      });
    });
    
    // Test endpoint that returns small data
    app.get('/test-small', (req, res) => {
      res.json({ message: 'small' });
    });
    
    // Test endpoint with no compression header
    app.get('/test-no-compression', (req, res) => {
      res.set('Content-Type', 'text/plain');
      res.send('small response');
    });
    
    // Compression stats endpoint
    app.get('/stats', (req, res) => {
      res.json(compressionStats.getStats());
    });
  });

  afterAll(async () => {
    if (server) {
      server.close();
    }
  });

  describe('Basic Compression Functionality', () => {
    it('should compress large JSON responses', async () => {
      const response = await request(app)
        .get('/test-json')
        .set('Accept-Encoding', 'gzip, deflate')
        .expect(200);

      // Should have compression headers
      expect(response.headers['content-encoding']).toBe('gzip');
      expect(response.headers['vary']).toBe('Accept-Encoding');
      expect(response.headers['cache-control']).toBe('public, max-age=31536000');
      
      // Response should be compressed (smaller than original)
      const originalSize = JSON.stringify({
        data: 'x'.repeat(2000),
        timestamp: new Date().toISOString()
      }).length;
      
      expect(response.headers['content-length']).toBeDefined();
      const compressedSize = parseInt(response.headers['content-length']);
      expect(compressedSize).toBeLessThan(originalSize);
    });

    it('should not compress small responses', async () => {
      const response = await request(app)
        .get('/test-small')
        .set('Accept-Encoding', 'gzip, deflate')
        .expect(200);

      // Small responses should not be compressed
      expect(response.headers['content-encoding']).toBeUndefined();
    });

    it('should handle requests without compression support', async () => {
      const response = await request(app)
        .get('/test-json')
        .set('Accept-Encoding', 'identity')
        .expect(200);

      // Should not compress when client doesn't support it
      expect(response.headers['content-encoding']).toBeUndefined();
    });

    it('should respect x-no-compression header', async () => {
      const response = await request(app)
        .get('/test-json')
        .set('Accept-Encoding', 'gzip, deflate')
        .set('x-no-compression', 'true')
        .expect(200);

      // Should not compress when client explicitly requests no compression
      expect(response.headers['content-encoding']).toBeUndefined();
    });
  });

  describe('Selective Compression', () => {
    beforeEach(() => {
      app = express();
      app.use(selectiveCompression({
        enabled: true,
        excludeRoutes: ['/health', '/metrics'],
        includeRoutes: ['/api'],
        minSize: 1024
      }));
      
      app.get('/api/test', (req, res) => {
        res.json({ data: 'x'.repeat(2000) });
      });
      
      app.get('/health', (req, res) => {
        res.json({ status: 'ok' });
      });
      
      app.get('/other', (req, res) => {
        res.json({ data: 'x'.repeat(2000) });
      });
    });

    it('should compress included routes', async () => {
      const response = await request(app)
        .get('/api/test')
        .set('Accept-Encoding', 'gzip, deflate')
        .expect(200);

      expect(response.headers['content-encoding']).toBe('gzip');
    });

    it('should not compress excluded routes', async () => {
      const response = await request(app)
        .get('/health')
        .set('Accept-Encoding', 'gzip, deflate')
        .expect(200);

      expect(response.headers['content-encoding']).toBeUndefined();
    });

    it('should not compress routes not in include list', async () => {
      const response = await request(app)
        .get('/other')
        .set('Accept-Encoding', 'gzip, deflate')
        .expect(200);

      expect(response.headers['content-encoding']).toBeUndefined();
    });
  });

  describe('Compression Statistics', () => {
    it('should track compression metrics', async () => {
      // Reset stats
      compressionStats.reset();
      
      // Make a compressed request
      await request(app)
        .get('/test-json')
        .set('Accept-Encoding', 'gzip, deflate')
        .expect(200);

      // Check stats
      const stats = compressionStats.getStats();
      expect(stats.totalRequests).toBeGreaterThan(0);
      expect(stats.compressedResponses).toBeGreaterThan(0);
      expect(parseFloat(stats.avgCompressionRatio)).toBeGreaterThan(0);
      expect(parseFloat(stats.avgCompressionTime)).toBeGreaterThanOrEqual(0);
    });

    it('should reset statistics correctly', async () => {
      // Make some requests to generate stats
      await request(app)
        .get('/test-json')
        .set('Accept-Encoding', 'gzip, deflate')
        .expect(200);

      // Reset stats
      compressionStats.reset();
      
      // Check stats are reset
      const stats = compressionStats.getStats();
      expect(stats.totalRequests).toBe(0);
      expect(stats.compressedResponses).toBe(0);
      expect(stats.avgCompressionRatio).toBe('0.00%');
      expect(stats.avgCompressionTime).toBe('0.00ms');
      expect(stats.totalBandwidthSaved).toBe('0.00MB');
    });

    it('should calculate compression ratio correctly', async () => {
      compressionStats.reset();
      
      // Record a manual compression event
      compressionStats.record(10000, 3000, 50); // 10KB -> 3KB in 50ms
      
      const stats = compressionStats.getStats();
      expect(stats.totalRequests).toBe(1);
      expect(stats.compressedResponses).toBe(1);
      expect(stats.avgCompressionRatio).toBe('70.00%'); // (10000-3000)/10000 * 100
      expect(stats.avgCompressionTime).toBe('50.00ms');
      expect(stats.totalBandwidthSaved).toBe('0.01MB'); // (10000-3000) bytes
    });
  });

  describe('Content Type Filtering', () => {
    beforeEach(() => {
      app = express();
      app.use(compressionWithLogging);
      
      // JSON endpoint (should compress)
      app.get('/json', (req, res) => {
        res.json({ data: 'x'.repeat(2000) });
      });
      
      // HTML endpoint (should compress)
      app.get('/html', (req, res) => {
        res.set('Content-Type', 'text/html');
        res.send('<html>' + 'x'.repeat(2000) + '</html>');
      });
      
      // CSS endpoint (should compress)
      app.get('/css', (req, res) => {
        res.set('Content-Type', 'text/css');
        res.send('body { ' + 'x'.repeat(2000) + ' }');
      });
      
      // JavaScript endpoint (should compress)
      app.get('/js', (req, res) => {
        res.set('Content-Type', 'application/javascript');
        res.send('var data = "' + 'x'.repeat(2000) + '";');
      });
      
      // Image endpoint (should not compress)
      app.get('/image', (req, res) => {
        res.set('Content-Type', 'image/jpeg');
        res.send(Buffer.alloc(5000)); // 5KB of zeros
      });
    });

    it('should compress JSON content', async () => {
      const response = await request(app)
        .get('/json')
        .set('Accept-Encoding', 'gzip, deflate')
        .expect(200);

      expect(response.headers['content-encoding']).toBe('gzip');
    });

    it('should compress HTML content', async () => {
      const response = await request(app)
        .get('/html')
        .set('Accept-Encoding', 'gzip, deflate')
        .expect(200);

      expect(response.headers['content-encoding']).toBe('gzip');
    });

    it('should compress CSS content', async () => {
      const response = await request(app)
        .get('/css')
        .set('Accept-Encoding', 'gzip, deflate')
        .expect(200);

      expect(response.headers['content-encoding']).toBe('gzip');
    });

    it('should compress JavaScript content', async () => {
      const response = await request(app)
        .get('/js')
        .set('Accept-Encoding', 'gzip, deflate')
        .expect(200);

      expect(response.headers['content-encoding']).toBe('gzip');
    });

    it('should not compress image content', async () => {
      const response = await request(app)
        .get('/image')
        .set('Accept-Encoding', 'gzip, deflate')
        .expect(200);

      expect(response.headers['content-encoding']).toBeUndefined();
    });
  });

  describe('Performance Testing', () => {
    it('should handle concurrent compressed requests', async () => {
      const requests = Array(10).fill().map(() =>
        request(app)
          .get('/test-json')
          .set('Accept-Encoding', 'gzip, deflate')
      );

      const responses = await Promise.all(requests);
      
      responses.forEach(response => {
        expect(response.status).toBe(200);
        expect(response.headers['content-encoding']).toBe('gzip');
      });
    });

    it('should complete compression within reasonable time', async () => {
      const startTime = Date.now();
      
      await request(app)
        .get('/test-json')
        .set('Accept-Encoding', 'gzip, deflate')
        .expect(200);
      
      const endTime = Date.now();
      const responseTime = endTime - startTime;
      
      // Should complete within 100ms for a reasonable payload
      expect(responseTime).toBeLessThan(100);
    });
  });

  describe('Error Handling', () => {
    it('should handle malformed accept-encoding headers', async () => {
      const response = await request(app)
        .get('/test-json')
        .set('Accept-Encoding', 'invalid-header')
        .expect(200);

      // Should still respond, just without compression
      expect(response.status).toBe(200);
    });

    it('should handle requests without accept-encoding header', async () => {
      const response = await request(app)
        .get('/test-json')
        .expect(200);

      // Should respond without compression
      expect(response.headers['content-encoding']).toBeUndefined();
      expect(response.status).toBe(200);
    });
  });

  describe('Headers and Caching', () => {
    it('should add appropriate headers', async () => {
      const response = await request(app)
        .get('/test-json')
        .set('Accept-Encoding', 'gzip, deflate')
        .expect(200);

      expect(response.headers['vary']).toBe('Accept-Encoding');
      expect(response.headers['cache-control']).toBe('public, max-age=31536000');
    });

    it('should preserve existing headers', async () => {
      app.get('/test-headers', (req, res) => {
        res.set('X-Custom-Header', 'test-value');
        res.json({ data: 'x'.repeat(2000) });
      });

      const response = await request(app)
        .get('/test-headers')
        .set('Accept-Encoding', 'gzip, deflate')
        .expect(200);

      expect(response.headers['x-custom-header']).toBe('test-value');
      expect(response.headers['content-encoding']).toBe('gzip');
    });
  });
});
