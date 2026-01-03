const { specs, swaggerUi, swaggerUiOptions } = require('../config/swagger');

/**
 * Swagger documentation middleware
 * Sets up API documentation endpoints
 */
const setupSwagger = (app) => {
  // API Documentation endpoint
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(specs, swaggerUiOptions));

  // Raw JSON specification endpoint
  app.get('/api-docs.json', (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.send(specs);
  });

  // Redirect root API to documentation
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
      },
    });
  });

  // Add Swagger annotations to existing routes
  app.get('/api/swagger-info', (req, res) => {
    res.json({
      success: true,
      message: 'Swagger API Documentation Information',
      data: {
        title: 'Interview Backend API',
        version: '1.0.0',
        description: 'Comprehensive Node.js backend system with JWT authentication, file uploads, and load balancing',
        endpoints: {
          documentation: '/api-docs',
          jsonSpec: '/api-docs.json',
          apiInfo: '/api',
        },
        features: [
          'Interactive API documentation',
          'Request/response examples',
          'Schema validation',
          'Authentication testing',
          'Code generation support',
        ],
        security: {
          type: 'JWT',
          scheme: 'Bearer',
          authorizationUrl: '/api/users/login',
        },
      },
      timestamp: new Date().toISOString(),
    });
  });
};

module.exports = setupSwagger;
