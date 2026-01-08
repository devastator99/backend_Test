const cors = require('cors');
const { performanceLogger } = require('../utils/logger');

/**
 * Enhanced CORS middleware with dynamic configuration
 */
const corsMiddleware = (options = {}) => {
  // Default CORS configuration
  const defaultConfig = {
    origin: (origin, callback) => {
      // Allow requests with no origin (mobile apps, curl, etc.)
      if (!origin) return callback(null, true);
      
      // Environment-based origin handling
      const allowedOrigins = process.env.NODE_ENV === 'production'
        ? (process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',') : ['https://yourdomain.com'])
        : ['http://localhost:3000', 'http://localhost:3001', 'http://localhost:8080', 'http://127.0.0.1:3000'];
      
      if (allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        performanceLogger.warn('CORS: Origin not allowed', { origin, allowedOrigins });
        callback(new Error('Not allowed by CORS'));
      }
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: [
      'Origin',
      'X-Requested-With',
      'Content-Type',
      'Accept',
      'Authorization',
      'X-Request-ID',
      'X-No-Compression',
      'Cache-Control'
    ],
    exposedHeaders: [
      'X-Request-ID',
      'X-Total-Count',
      'X-Rate-Limit-Limit',
      'X-Rate-Limit-Remaining',
      'X-Rate-Limit-Reset',
      'Retry-After'
    ],
    credentials: true,
    maxAge: 86400, // 24 hours
    preflightContinue: false,
    optionsSuccessStatus: 204
  };
  
  // Merge with provided options
  const config = { ...defaultConfig, ...options };
  
  return cors(config);
};

/**
 * Development CORS middleware (more permissive)
 */
const devCorsMiddleware = cors({
  origin: true, // Allow all origins in development
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: '*',
  exposedHeaders: '*',
  credentials: true,
  maxAge: 86400
});

/**
 * Production CORS middleware (strict)
 */
const prodCorsMiddleware = cors({
  origin: process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',') : ['https://yourdomain.com'],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: [
    'Origin',
    'X-Requested-With',
    'Content-Type',
    'Accept',
    'Authorization',
    'X-Request-ID'
  ],
  exposedHeaders: [
    'X-Request-ID',
    'X-Total-Count',
    'X-Rate-Limit-Limit',
    'X-Rate-Limit-Remaining',
    'X-Rate-Limit-Reset'
  ],
  credentials: true,
  maxAge: 86400,
  preflightContinue: false,
  optionsSuccessStatus: 204
});

/**
 * API-specific CORS middleware
 */
const apiCorsMiddleware = cors({
  origin: (origin, callback) => {
    // API-specific origin validation
    const apiOrigins = process.env.API_ALLOWED_ORIGINS 
      ? process.env.API_ALLOWED_ORIGINS.split(',')
      : process.env.NODE_ENV === 'production'
        ? ['https://api.yourdomain.com', 'https://yourdomain.com']
        : ['http://localhost:3000', 'http://localhost:3001'];
    
    if (!origin || apiOrigins.includes(origin)) {
      callback(null, true);
    } else {
      performanceLogger.warn('API CORS: Origin not allowed', { origin, apiOrigins });
      callback(new Error('Not allowed by API CORS'));
    }
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: [
    'Origin',
    'X-Requested-With',
    'Content-Type',
    'Accept',
    'Authorization',
    'X-Request-ID',
    'X-API-Key'
  ],
  exposedHeaders: [
    'X-Request-ID',
    'X-Total-Count',
    'X-API-Version',
    'X-Rate-Limit-Limit',
    'X-Rate-Limit-Remaining',
    'X-Rate-Limit-Reset'
  ],
  credentials: true,
  maxAge: 7200 // 2 hours for API
});

/**
 * CORS error handler
 */
const corsErrorHandler = (err, req, res, next) => {
  if (err.message === 'Not allowed by CORS' || err.message === 'Not allowed by API CORS') {
    performanceLogger.warn('CORS violation', {
      origin: req.headers.origin,
      method: req.method,
      url: req.url,
      userAgent: req.headers['user-agent']
    });
    
    return res.status(403).json({
      success: false,
      message: 'CORS policy violation',
      error: 'Origin not allowed',
      timestamp: new Date().toISOString()
    });
  }
  
  next(err);
};

/**
 * CORS preflight handler
 */
const corsPreflightHandler = (req, res) => {
  const origin = req.headers.origin;
  const method = req.headers['access-control-request-method'];
  const headers = req.headers['access-control-request-headers'];
  
  // Log preflight requests
  performanceLogger.info('CORS preflight', {
    origin,
    method,
    headers,
    url: req.url
  });
  
  // Set appropriate headers
  res.header('Access-Control-Allow-Origin', origin || '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization, X-Request-ID');
  res.header('Access-Control-Allow-Credentials', 'true');
  res.header('Access-Control-Max-Age', '86400');
  
  res.status(204).send();
};

/**
 * Dynamic CORS middleware based on environment
 */
const dynamicCorsMiddleware = (req, res, next) => {
  const env = process.env.NODE_ENV || 'development';
  
  // Choose CORS middleware based on environment
  let corsMiddleware;
  
  switch (env) {
    case 'production':
      corsMiddleware = prodCorsMiddleware;
      break;
    case 'development':
      corsMiddleware = devCorsMiddleware;
      break;
    default:
      corsMiddleware = corsMiddleware();
      break;
  }
  
  // Apply the selected CORS middleware
  return corsMiddleware(req, res, next);
};

module.exports = {
  corsMiddleware,
  devCorsMiddleware,
  prodCorsMiddleware,
  apiCorsMiddleware,
  corsErrorHandler,
  corsPreflightHandler,
  dynamicCorsMiddleware
};
