// Simple setup for API documentation tests without database dependencies
const request = require('supertest');

// Mock app for documentation tests
const createMockApp = () => {
  const express = require('express');
  const app = express();
  
  // Basic middleware
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  
  // Documentation routes only
  const setupSwagger = require('../src/middleware/swagger');
  setupSwagger(app);
  
  // Mock health endpoint
  app.get('/health', (req, res) => {
    res.json({
      success: true,
      message: 'Server is running',
      timestamp: new Date().toISOString(),
      environment: 'test',
      database: { status: 'connected' },
      cache: { keys: 0, hits: 0, misses: 0, hitRate: 0 },
    });
  });
  
  // Mock API overview
  app.get('/api', (req, res) => {
    res.json({
      success: true,
      message: 'Interview Backend API',
      version: '1.0.0',
      timestamp: new Date().toISOString(),
      documentation: {
        swagger: `${req.protocol}://${req.get('host')}/api-docs`,
        json: `${req.protocol}://${req.get('host')}/api-docs.json`,
      },
      endpoints: {
        auth: {
          'POST /api/users/register': 'Register a new user',
          'POST /api/users/login': 'Login user',
        },
        health: {
          'GET /health': 'System health check',
        },
      },
      features: {
        authentication: 'JWT-based authentication',
        documentation: 'Swagger/OpenAPI documentation',
      },
    });
  });
  
  return app;
};

module.exports = {
  app: createMockApp(),
  request,
};
