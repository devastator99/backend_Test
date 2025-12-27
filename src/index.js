require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const requestLogger = require('./middleware/requestLogger');
const errorHandler = require('./middleware/errorHandler');
const rateLimitMiddleware = require('./middleware/rateLimiter');

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
app.use(requestLogger);
app.use(rateLimitMiddleware);

app.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'Server is running',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
  });
});

app.get('/api', (req, res) => {
  res.json({
    success: true,
    message: 'Interview Backend API',
    version: '1.0.0',
    endpoints: {
      auth: {
        'POST /api/users/register': 'Register a new user',
        'POST /api/users/login': 'Login user',
        'GET /api/users/profile': 'Get current user profile (auth required)',
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
  });
});

app.use(errorHandler);

const gracefulShutdown = (signal) => {
  console.log(`Received ${signal}. Starting graceful shutdown...`);
  server.close(() => {
    console.log('HTTP server closed');
    process.exit(0);
  });
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

const server = app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV}`);
  console.log(`API Documentation: http://localhost:${PORT}/api`);
});

module.exports = app;
