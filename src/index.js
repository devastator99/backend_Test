require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const path = require('path');
const dbConnection = require('./config/database');
const { requestLogger, errorLogger, performanceLogger } = require('./utils/logger');
const { globalErrorHandler } = require('./utils/errors');
const rateLimitMiddleware = require('./middleware/rateLimiter');
const { sanitizeInput } = require('./middleware/validation');
const { cacheMiddleware } = require('./utils/cache');

const userRoutes = require('./routes/userRoutes');
const productRoutes = require('./routes/productRoutes');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(helmet());
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? ['https://yourdomain.com'] 
    : ['http://localhost:3000', 'http://localhost:3001'],
  credentials: true,
}));
app.use(compression());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(sanitizeInput);
app.use(requestLogger);
app.use(performanceLogger);
app.use(rateLimitMiddleware);

app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

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
    res.status(500).json({
      success: false,
      message: 'Health check failed',
      error: error.message,
    });
  }
});

app.get('/api', cacheMiddleware(300), (req, res) => {
  res.json({
    success: true,
    message: 'Interview Backend API',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
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
  });
});

app.use(errorLogger);
app.use(globalErrorHandler);

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
    
    const server = app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
      console.log(`📝 Environment: ${process.env.NODE_ENV}`);
      console.log(`📚 API Documentation: http://localhost:${PORT}/api`);
      console.log(`💚 Health Check: http://localhost:${PORT}/health`);
      console.log(`📁 Uploads: http://localhost:${PORT}/uploads`);
    });

    return server;
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

const server = startServer();

module.exports = app;
