/**
 * Response helper utilities
 * Standardizes API responses and adds common functionality
 */

/**
 * Standard success response
 */
const successResponse = (res, data = null, message = 'Operation successful', statusCode = 200, meta = {}) => {
  const response = {
    success: true,
    message,
    data,
    timestamp: new Date().toISOString(),
    ...meta
  };
  
  return res.status(statusCode).json(response);
};

/**
 * Standard error response
 */
const errorResponse = (res, message = 'Operation failed', statusCode = 500, errors = null, meta = {}) => {
  const response = {
    success: false,
    message,
    timestamp: new Date().toISOString(),
    ...meta
  };
  
  if (errors) {
    response.errors = errors;
  }
  
  return res.status(statusCode).json(response);
};

/**
 * Paginated response helper
 */
const paginatedResponse = (res, items, pagination, message = 'Data retrieved successfully') => {
  const response = {
    success: true,
    message,
    data: {
      items,
      pagination: {
        page: pagination.page,
        limit: pagination.limit,
        total: pagination.total,
        pages: pagination.pages,
        hasNext: pagination.hasNext,
        hasPrev: pagination.hasPrev
      }
    },
    timestamp: new Date().toISOString()
  };
  
  return res.status(200).json(response);
};

/**
 * Created response helper
 */
const createdResponse = (res, data = null, message = 'Resource created successfully') => {
  return successResponse(res, data, message, 201);
};

/**
 * Updated response helper
 */
const updatedResponse = (res, data = null, message = 'Resource updated successfully') => {
  return successResponse(res, data, message, 200);
};

/**
 * Deleted response helper
 */
const deletedResponse = (res, message = 'Resource deleted successfully') => {
  return successResponse(res, null, message, 200);
};

/**
 * Not found response helper
 */
const notFoundResponse = (res, message = 'Resource not found') => {
  return errorResponse(res, message, 404);
};

/**
 * Bad request response helper
 */
const badRequestResponse = (res, message = 'Bad request', errors = null) => {
  return errorResponse(res, message, 400, errors);
};

/**
 * Unauthorized response helper
 */
const unauthorizedResponse = (res, message = 'Unauthorized') => {
  return errorResponse(res, message, 401);
};

/**
 * Forbidden response helper
 */
const forbiddenResponse = (res, message = 'Forbidden') => {
  return errorResponse(res, message, 403);
};

/**
 * Conflict response helper
 */
const conflictResponse = (res, message = 'Resource conflict') => {
  return errorResponse(res, message, 409);
};

/**
 * Rate limit response helper
 */
const rateLimitResponse = (res, retryAfter = null, message = 'Too many requests') => {
  const response = errorResponse(res, message, 429);
  
  if (retryAfter) {
    res.setHeader('Retry-After', retryAfter);
  }
  
  return response;
};

/**
 * Validation error response helper
 */
const validationErrorResponse = (res, errors, message = 'Validation failed') => {
  return errorResponse(res, message, 400, errors);
};

/**
 * Server error response helper
 */
const serverErrorResponse = (res, message = 'Internal server error') => {
  return errorResponse(res, message, 500);
};

/**
 * File download response helper
 */
const fileDownloadResponse = (res, filePath, fileName, contentType = 'application/octet-stream') => {
  const fs = require('fs');
  const path = require('path');
  
  if (!fs.existsSync(filePath)) {
    return notFoundResponse(res, 'File not found');
  }
  
  const fileStats = fs.statSync(filePath);
  
  res.setHeader('Content-Type', contentType);
  res.setHeader('Content-Length', fileStats.size);
  res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
  
  const fileStream = fs.createReadStream(filePath);
  return fileStream.pipe(res);
};

/**
 * Stream response helper
 */
const streamResponse = (res, stream, contentType = 'application/octet-stream') => {
  res.setHeader('Content-Type', contentType);
  res.setHeader('Transfer-Encoding', 'chunked');
  
  return stream.pipe(res);
};

/**
 * Cache control helper
 */
const setCacheControl = (res, maxAge = 3600, type = 'public') => {
  const cacheControl = `${type}, max-age=${maxAge}`;
  res.setHeader('Cache-Control', cacheControl);
  res.setHeader('Expires', new Date(Date.now() + maxAge * 1000).toUTCString());
};

/**
 * ETag helper
 */
const setETag = (res, data) => {
  const crypto = require('crypto');
  const etag = crypto.createHash('md5').update(JSON.stringify(data)).digest('hex');
  res.setHeader('ETag', `"${etag}"`);
  return etag;
};

/**
 * Conditional response helper (ETag-based)
 */
const conditionalResponse = (req, res, data, statusCode = 200) => {
  const etag = setETag(res, data);
  const ifNoneMatch = req.headers['if-none-match'];
  
  if (ifNoneMatch && ifNoneMatch === etag) {
    return res.status(304).end();
  }
  
  return successResponse(res, data, 'OK', statusCode);
};

/**
 * API version response helper
 */
const versionResponse = (res, version, message = 'API version information') => {
  return successResponse(res, {
    version,
    environment: process.env.NODE_ENV || 'development',
    timestamp: new Date().toISOString(),
    uptime: require('os').uptime()
  }, message, 200);
};

/**
 * Health check response helper
 */
const healthResponse = (res, healthData, message = 'Health check completed') => {
  const statusCode = healthData.status === 'healthy' ? 200 : 503;
  return successResponse(res, healthData, message, statusCode);
};

/**
 * Rate limit headers helper
 */
const setRateLimitHeaders = (res, limit, remaining, reset) => {
  res.setHeader('X-Rate-Limit-Limit', limit);
  res.setHeader('X-Rate-Limit-Remaining', remaining);
  res.setHeader('X-Rate-Limit-Reset', reset);
};

/**
 * Pagination headers helper
 */
const setPaginationHeaders = (res, pagination) => {
  res.setHeader('X-Total-Count', pagination.total);
  res.setHeader('X-Page', pagination.page);
  res.setHeader('X-Per-Page', pagination.limit);
  res.setHeader('X-Total-Pages', pagination.pages);
};

/**
 * Security headers helper
 */
const setSecurityHeaders = (res) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
};

/**
 * API metadata helper
 */
const setApiMetadata = (res, metadata = {}) => {
  res.setHeader('X-API-Version', process.env.API_VERSION || '1.0.0');
  res.setHeader('X-Server-Time', new Date().toISOString());
  res.setHeader('X-Request-ID', res.locals.requestId || 'unknown');
  
  Object.keys(metadata).forEach(key => {
    res.setHeader(`X-${key}`, metadata[key]);
  });
};

/**
 * Response time helper
 */
const responseTimeMiddleware = (req, res, next) => {
  const startTime = Date.now();
  
  res.on('finish', () => {
    const responseTime = Date.now() - startTime;
    res.setHeader('X-Response-Time', `${responseTime}ms`);
  });
  
  next();
};

module.exports = {
  successResponse,
  errorResponse,
  paginatedResponse,
  createdResponse,
  updatedResponse,
  deletedResponse,
  notFoundResponse,
  badRequestResponse,
  unauthorizedResponse,
  forbiddenResponse,
  conflictResponse,
  rateLimitResponse,
  validationErrorResponse,
  serverErrorResponse,
  fileDownloadResponse,
  streamResponse,
  setCacheControl,
  setETag,
  conditionalResponse,
  versionResponse,
  healthResponse,
  setRateLimitHeaders,
  setPaginationHeaders,
  setSecurityHeaders,
  setApiMetadata,
  responseTimeMiddleware
};
