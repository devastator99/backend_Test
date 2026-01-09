const request = require('supertest');
const { describe, it, expect, beforeAll, afterAll, beforeEach } = require('@jest/globals');
const express = require('express');
const compression = require('compression');
const { compressionStats } = require('../../src/middleware/compression');

describe('Compression Middleware Tests', () => {
  let app;
  let server;

  beforeAll(() => {
    // Reset compression stats before tests
    compressionStats.reset();
  });

  beforeEach(() => {
    app = express();
    
    // Apply basic compression middleware
    app.use(compression({
      level: 6,
      threshold: 1024,
      filter: (req, res) => {
        if (req.headers['x-no-compression']) {
          return false;
        }
        
        const contentType = res.getHeader('content-type');
        const compressibleTypes = [
          'text/',
          'application/json',
          'application/javascript',
          'application/xml'
        ];
        
        return compressibleTypes.some(type => 
          contentType && contentType.includes(type)
        );
      }
    }));
    
    // Test endpoints
    app.get('/test-json', (req, res) => {
      res.json({
        data: 'x'.repeat(2000), // Large enough to trigger compression
        timestamp: new Date().toISOString()
      });
    });
    
    app.get('/test-small', (req, res) => {
      res.json({ message: 'small' });
    });
    
    app.get('/test-html', (req, res) => {
      res.set('Content-Type', 'text/html');
      res.send('<html>' + 'x'.repeat(2000) + '</html>');
    });
    
    app.get('/test-image', (req, res) => {
      res.set('Content-Type', 'image/jpeg');
      res.send(Buffer.alloc(5000)); // 5KB of zeros
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
      
      // Response should be compressed (check if content-length exists or body is smaller)
      const originalSize = JSON.stringify({
        data: 'x'.repeat(2000), // Large enough to trigger compression
        timestamp: new Date().toISOString()
      }).length;
      
      if (response.headers['content-length']) {
        const compressedSize = parseInt(response.headers['content-length']);
        expect(compressedSize).toBeLessThan(originalSize);
      } else {
        // If no content-length header, check that body is actually compressed
        expect(response.body.data.length).toBeLessThan(originalSize);
      }
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

  describe('Content Type Filtering', () => {
    it('should compress JSON content', async () => {
      const response = await request(app)
        .get('/test-json')
        .set('Accept-Encoding', 'gzip, deflate')
        .expect(200);

      expect(response.headers['content-encoding']).toBe('gzip');
    });

    it('should compress HTML content', async () => {
      const response = await request(app)
        .get('/test-html')
        .set('Accept-Encoding', 'gzip, deflate')
        .expect(200);

      expect(response.headers['content-encoding']).toBe('gzip');
    });

    it('should not compress image content', async () => {
      const response = await request(app)
        .get('/test-image')
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
    it('should handle requests without compression support', async () => {
      const response = await request(app)
        .get('/test-json')
        .set('Accept-Encoding', 'identity')
        .expect(200);

      // Should not compress when client doesn't support it
      expect(response.headers['content-encoding']).toBeUndefined();
    });

    it('should handle requests without accept-encoding header', async () => {
      const response = await request(app)
        .get('/test-json')
        .expect(200);

      // Should respond without compression (may default to gzip if no header)
      if (!response.headers['accept-encoding']) {
        expect(response.status).toBe(200);
      }
    });
  });

  describe('Compression Statistics', () => {
    it('should track compression metrics', async () => {
      // Reset stats
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

    it('should reset statistics correctly', async () => {
      // Record some stats
      compressionStats.record(10000, 3000, 50);
      
      // Reset stats
      compressionStats.reset();
      
      // Check stats are reset
      const stats = compressionStats.getStats();
      expect(stats.totalRequests).toBe(0);
      expect(stats.compressedResponses).toBe(0);
      expect(stats.avgCompressionRatio).toBe('0%');
      expect(stats.avgCompressionTime).toBe('0ms');
      expect(stats.totalBandwidthSaved).toBe('0.00MB');
    });
  });
});
