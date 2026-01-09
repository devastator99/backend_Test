const request = require('supertest');
const { describe, it, expect, beforeAll, afterAll } = require('@jest/globals');
const express = require('express');
const { 
  healthCheck, 
  simpleHealthCheck, 
  livenessProbe, 
  readinessProbe 
} = require('../../src/middleware/healthCheck');

describe('Health Check Middleware Tests', () => {
  let app;

  beforeAll(() => {
    app = express();
    
    // Add health check endpoints
    app.get('/health', healthCheck);
    app.get('/health/simple', simpleHealthCheck);
    app.get('/liveness', livenessProbe);
    app.get('/readiness', readinessProbe);
  });

  describe('Enhanced Health Check', () => {
    it('should return comprehensive health information', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);

      const healthData = response.body.data;
      
      expect(response.body.success).toBe(true);
      expect(healthData.status).toBe('healthy');
      expect(healthData.timestamp).toBeDefined();
      expect(healthData.uptime).toBeDefined();
      expect(healthData.version).toBeDefined();
      expect(healthData.environment).toBeDefined();
      
      // Check database status
      expect(healthData.database).toBeDefined();
      expect(healthData.database.status).toBe('connected');
      expect(healthData.database.latency).toBeDefined();
      
      // Check cache status
      expect(healthData.cache).toBeDefined();
      expect(['connected', 'disconnected', 'error']).toContain(healthData.cache.status);
      
      // Check file system status
      expect(healthData.fileSystem).toBeDefined();
      expect(healthData.fileSystem.status).toBe('ok');
      expect(healthData.fileSystem.writable).toBe(true);
      
      // Check memory usage
      expect(healthData.memory).toBeDefined();
      expect(healthData.memory.used).toMatch(/\d+MB/);
      expect(healthData.memory.total).toMatch(/\d+MB/);
      expect(healthData.memory.percentage).toMatch(/\d+\.\d+%/);
      
      // Check performance info
      expect(healthData.performance).toBeDefined();
      expect(healthData.performance.responseTime).toMatch(/\d+ms/);
      expect(healthData.performance.compression).toBeDefined();
      expect(healthData.performance.rateLimiting).toBe('enabled');
    });

    it('should include proper headers', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);

      expect(response.headers['content-type']).toContain('application/json');
    });
  });

  describe('Simple Health Check', () => {
    it('should return basic health status', async () => {
      const response = await request(app)
        .get('/health/simple')
        .expect(200);

      expect(response.body.status).toBe('ok');
      expect(response.body.timestamp).toBeDefined();
    });
  });

  describe('Liveness Probe', () => {
    it('should return alive status', async () => {
      const response = await request(app)
        .get('/liveness')
        .expect(200);

      expect(response.body.status).toBe('alive');
      expect(response.body.timestamp).toBeDefined();
    });
  });

  describe('Readiness Probe', () => {
    it('should return ready status when database is available', async () => {
      const response = await request(app)
        .get('/readiness')
        .expect(200);

      expect(response.body.status).toBe('ready');
      expect(response.body.timestamp).toBeDefined();
    });
  });

  describe('Health Check Data Structure', () => {
    it('should have consistent response structure', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);

      // Check main response structure
      expect(response.body).toHaveProperty('success');
      expect(response.body).toHaveProperty('message');
      expect(response.body).toHaveProperty('data');
      expect(response.body).toHaveProperty('timestamp');
      
      // Check data structure
      const data = response.body.data;
      expect(data).toHaveProperty('status');
      expect(data).toHaveProperty('timestamp');
      expect(data).toHaveProperty('uptime');
      expect(data).toHaveProperty('version');
      expect(data).toHaveProperty('environment');
      expect(data).toHaveProperty('database');
      expect(data).toHaveProperty('cache');
      expect(data).toHaveProperty('fileSystem');
      expect(data).toHaveProperty('memory');
      expect(data).toHaveProperty('performance');
    });

    it('should have valid memory data format', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);

      const memory = response.body.data.memory;
      
      expect(memory.used).toMatch(/^\d+MB$/);
      expect(memory.total).toMatch(/^\d+MB$/);
      expect(memory.percentage).match(/^\d+\.\d+%$/);
      expect(memory.rss).toMatch(/^\d+MB$/);
    });

    it('should have valid database data format', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);

      const database = response.body.data.database;
      
      expect(['connected', 'disconnected', 'error']).toContain(database.status);
      if (database.latency) {
        expect(database.latency).match(/^\d+ms$/);
      }
      expect(database.type).toBeDefined();
    });

    it('should have valid performance data format', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);

      const performance = response.body.data.performance;
      
      expect(performance.responseTime).match(/^\d+ms$/);
      expect(['enabled', 'disabled']).toContain(performance.compression);
      expect(performance.rateLimiting).toBe('enabled');
    });
  });

  describe('Response Times', () => {
    it('should respond quickly', async () => {
      const startTime = Date.now();
      
      await request(app)
        .get('/health')
        .expect(200);
      
      const responseTime = Date.now() - startTime;
      expect(responseTime).toBeLessThan(100); // Should respond within 100ms
    });

    it('should handle concurrent health checks', async () => {
      const requests = Array(10).fill().map(() =>
        request(app).get('/health')
      );

      const responses = await Promise.all(requests);
      
      responses.forEach(response => {
        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle malformed requests gracefully', async () => {
      // Health check should be robust
      const response = await request(app)
        .get('/health')
        .set('User-Agent', 'Malformed-Agent')
        .expect(200);

      expect(response.body.success).toBe(true);
    });
  });

  describe('Environment Detection', () => {
    it('should detect environment correctly', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);

      const environment = response.body.data.environment;
      expect(['development', 'production', 'test']).toContain(environment);
    });
  });

  describe('Version Information', () => {
    it('should include version information', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);

      const version = response.body.data.version;
      expect(version).toBeDefined();
      expect(typeof version).toBe('string');
    });
  });

  describe('Uptime Formatting', () => {
    it('should format uptime correctly', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);

      const uptime = response.body.data.uptime;
      expect(uptime).toBeDefined();
      expect(typeof uptime).toBe('string');
      
      // Should match format like "1d 2h 3m 4s" or just "30s"
      expect(uptime).toMatch(/^(\d+d\s)?(\d+h\s)?(\d+m\s)?\d+s$/);
    });
  });
});
