require('dotenv').config();
const { validateEnvironment } = require('./config/env');

// Validate environment variables before starting
if (!validateEnvironment()) {
  process.exit(1);
}

const express = require('express');
const helmet = require('helmet');
const path = require('path');
const dbConnection = require('./config/database');
const { requestLogger, errorLogger, performanceLogger } = require('./utils/logger');
const { globalErrorHandler } = require('./utils/errors');
const { 
  rateLimitMiddleware: rateLimitMiddlewareFn, 
  authRateLimitMiddleware,
  uploadRateLimitMiddleware,
  sensitiveRateLimitMiddleware,
  createCustomRateLimiter,
  getRateLimitStatus,
  resetRateLimit
} = require('./middleware/rateLimiter');
const { sanitizeInput } = require('./middleware/validation');
const { cacheMiddleware } = require('./utils/cache');
const setupSwagger = require('./middleware/swagger');
const { 
  compressionWithLogging, 
  selectiveCompression, 
  compressionHeaders,
  compressionStats 
} = require('./middleware/compression');
const { 
  healthCheck, 
  simpleHealthCheck, 
  livenessProbe, 
  readinessProbe 
} = require('./middleware/healthCheck');
const { 
  requestIdMiddleware, 
  requestTrackingMiddleware,
  requestStatsEndpoint,
  resetRequestStats
} = require('./middleware/requestId');
const { 
  dynamicCorsMiddleware,
  corsErrorHandler 
} = require('./middleware/cors');
const { 
  responseTimeMiddleware,
  setApiMetadata,
  setSecurityHeaders
} = require('./utils/responseHelper');

const userRoutes = require('./routes/userRoutes');
const productRoutes = require('./routes/productRoutes');

const app = express();
const PORT = process.env.PORT || 3000;
let server; // Global server variable

// Security and CORS middleware
app.use(helmet());
app.use(dynamicCorsMiddleware);
app.use(corsErrorHandler);

// Request tracking and ID middleware
app.use(requestIdMiddleware);
app.use(requestTrackingMiddleware);
app.use(responseTimeMiddleware);

// Compression middleware
app.use(compressionHeaders);
app.use(selectiveCompression({
  enabled: process.env.COMPRESSION_ENABLED !== 'false',
  excludeRoutes: ['/health', '/metrics', '/liveness', '/readiness'],
  includeRoutes: ['/api', '/api-docs'],
  minSize: 1024
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(sanitizeInput);
app.use(requestLogger);
app.use(performanceLogger);
app.use(rateLimitMiddlewareFn);

app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

// Setup Swagger documentation
setupSwagger(app);

/**
 * @swagger
 * /health:
 *   get:
 *     tags:
 *       - Health
 *     summary: System health check
 *     description: Comprehensive health check including database and cache status
 *     responses:
 *       200:
 *         description: System is healthy
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/HealthCheck'
 *       503:
 *         description: System is unhealthy
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/HealthCheck'
 */
app.get('/health', async (req, res) => {
  try {
    const dbHealth = await dbConnection.healthCheck();
    const cacheStats = require('./utils/cache').cacheService.getStats();
    
    res.json({
      success: true,
      message: 'Server is running',
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV,
      database: dbHealth,
      cache: {
        keys: cacheStats.keys,
        hits: cacheStats.hits,
        misses: cacheStats.misses,
        hitRate: cacheStats.hits / (cacheStats.hits + cacheStats.misses) * 100 || 0,
      },
    });
  } catch (error) {
    res.status(503).json({
      success: false,
      message: 'Health check failed',
      error: error.message,
      timestamp: new Date().toISOString(),
    });
  }
});

app.get('/api', cacheMiddleware(300), (req, res) => {
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
        'GET /api/users/profile': 'Get current user profile (auth required)',
        'POST /api/users/avatar': 'Upload user avatar (auth required)',
        'DELETE /api/users/avatar': 'Remove user avatar (auth required)',
      },
      users: {
        'GET /api/users': 'Get all users (admin only)',
        'GET /api/users/:id': 'Get user by ID (auth required)',
        'PUT /api/users/:id': 'Update user (auth required)',
        'DELETE /api/users/:id': 'Delete user (admin only)',
      },
      products: {
        'GET /api/products': 'Get all products',
        'GET /api/products/:id': 'Get product by ID',
        'GET /api/products/category/:category': 'Get products by category',
        'GET /api/products/search?q=query': 'Search products',
        'POST /api/products': 'Create product (admin only)',
        'PUT /api/products/:id': 'Update product (admin only)',
        'DELETE /api/products/:id': 'Delete product (admin only)',
      },
      health: {
        'GET /health': 'System health check',
        'GET /api/health': 'API health check',
      },
      documentation: {
        'GET /api-docs': 'Interactive API documentation',
        'GET /api-docs.json': 'OpenAPI JSON specification',
      },
    },
    features: {
      authentication: 'JWT-based authentication',
      fileUpload: 'Image upload for user avatars',
      rateLimiting: 'Endpoint-specific rate limiting',
      loadBalancing: 'Nginx load balancer support',
      monitoring: 'Prometheus/Grafana integration',
      caching: 'Redis-based caching',
      logging: 'Winston logging system',
      validation: 'Request validation and sanitization',
      documentation: 'Swagger/OpenAPI documentation',
    },
  });
});

app.use('/api/users', userRoutes);
app.use('/api/products', productRoutes);

app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found',
    timestamp: new Date().toISOString(),
    availableEndpoints: {
      documentation: '/api-docs',
      health: '/health',
      api: '/api',
    },
  });
});

app.use(errorLogger);
app.use(globalErrorHandler);

// Enhanced health check endpoints
app.get('/health/simple', simpleHealthCheck);
app.get('/liveness', livenessProbe);
app.get('/readiness', readinessProbe);

// Request statistics endpoints
app.get('/request-stats', requestStatsEndpoint);
app.post('/request-stats/reset', resetRequestStats);

// Compression statistics endpoint
app.get('/compression-stats', (req, res) => {
  const stats = compressionStats.getStats();
  res.json({
    success: true,
    message: 'Compression statistics',
    data: stats,
    timestamp: new Date().toISOString()
  });
});

// Reset compression stats endpoint
app.post('/compression-stats/reset', (req, res) => {
  compressionStats.reset();
  res.json({
    success: true,
    message: 'Compression statistics reset',
    timestamp: new Date().toISOString()
  });
});

const gracefulShutdown = async (signal) => {
  console.log(`Received ${signal}. Starting graceful shutdown...`);
  
  try {
    await dbConnection.disconnect();
    server.close(() => {
      console.log('HTTP server closed');
      process.exit(0);
    });
  } catch (error) {
    console.error('Error during shutdown:', error);
    process.exit(1);
  }
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  gracefulShutdown('unhandledRejection');
});

process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  gracefulShutdown('uncaughtException');
});

const startServer = async () => {
  try {
    await dbConnection.connect();
    
    server = app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
      console.log(`📝 Environment: ${process.env.NODE_ENV}`);
      console.log(`🗜️  Compression: ${process.env.COMPRESSION_ENABLED !== 'false' ? 'Enabled' : 'Disabled'}`);
      console.log(`📚 API Documentation: http://localhost:${PORT}/api-docs`);
      console.log(`📄 OpenAPI Spec: http://localhost:${PORT}/api-docs.json`);
      console.log(`💚 Health Check: http://localhost:${PORT}/health`);
      console.log(`🏥 Liveness Probe: http://localhost:${PORT}/liveness`);
      console.log(`✅ Readiness Probe: http://localhost:${PORT}/readiness`);
      console.log(`📊 Compression Stats: http://localhost:${PORT}/compression-stats`);
      console.log(`📈 Request Stats: http://localhost:${PORT}/request-stats`);
      console.log(`📁 Uploads: http://localhost:${PORT}/uploads`);
      console.log(`🔐 JWT Service: http://localhost:${PORT}/api/swagger-info`);
    });

    return server;
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();

module.exports = app;
