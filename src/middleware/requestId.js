const { v4: uuidv4 } = require('uuid');
const { performanceLogger } = require('../utils/logger');

/**
 * Request ID middleware
 * Adds unique identifier to each request for tracing and debugging
 */
const requestIdMiddleware = (req, res, next) => {
  // Generate or use existing request ID
  const requestId = req.headers['x-request-id'] || uuidv4();
  
  // Add request ID to request object
  req.requestId = requestId;
  
  // Add request ID to response headers
  res.setHeader('X-Request-ID', requestId);
  
  // Add request ID to response locals for templates
  res.locals.requestId = requestId;
  
  // Log request with ID
  performanceLogger.info('Request started', {
    requestId,
    method: req.method,
    url: req.url,
    userAgent: req.headers['user-agent'],
    ip: req.ip,
    timestamp: new Date().toISOString()
  });
  
  // Override res.end to log completion
  const originalEnd = res.end;
  res.end = function(chunk, encoding) {
    // Log response completion
    performanceLogger.info('Request completed', {
      requestId,
      method: req.method,
      url: req.url,
      statusCode: res.statusCode,
      responseTime: Date.now() - req.startTime,
      contentLength: res.getHeader('content-length'),
      timestamp: new Date().toISOString()
    });
    
    // Call original end
    originalEnd.call(this, chunk, encoding);
  };
  
  // Add start time for performance tracking
  req.startTime = Date.now();
  
  next();
};

/**
 * Request tracking middleware
 * Tracks request patterns and statistics
 */
const requestTrackingMiddleware = () => {
  const stats = {
    totalRequests: 0,
    requestsByMethod: {},
    requestsByPath: {},
    averageResponseTime: 0,
    totalResponseTime: 0,
    errorCount: 0,
    lastReset: new Date()
  };
  
  return (req, res, next) => {
    // Update statistics
    stats.totalRequests++;
    stats.requestsByMethod[req.method] = (stats.requestsByMethod[req.method] || 0) + 1;
    stats.requestsByPath[req.path] = (stats.requestsByPath[req.path] || 0) + 1;
    
    // Track response completion
    const originalEnd = res.end;
    res.end = function(chunk, encoding) {
      const responseTime = Date.now() - req.startTime;
      stats.totalResponseTime += responseTime;
      stats.averageResponseTime = stats.totalResponseTime / stats.totalRequests;
      
      if (res.statusCode >= 400) {
        stats.errorCount++;
      }
      
      originalEnd.call(this, chunk, encoding);
    };
    
    // Add stats to request object
    req.requestStats = stats;
    
    next();
  };
};

/**
 * Request statistics endpoint
 */
const requestStatsEndpoint = (req, res) => {
  const stats = req.requestStats || {};
  
  res.json({
    success: true,
    message: 'Request statistics',
    data: {
      totalRequests: stats.totalRequests || 0,
      requestsByMethod: stats.requestsByMethod || {},
      requestsByPath: stats.requestsByPath || {},
      averageResponseTime: stats.averageResponseTime ? `${stats.averageResponseTime.toFixed(2)}ms` : '0ms',
      errorCount: stats.errorCount || 0,
      errorRate: stats.totalRequests > 0 ? `${((stats.errorCount / stats.totalRequests) * 100).toFixed(2)}%` : '0%',
      uptime: formatUptime(process.uptime()),
      lastReset: stats.lastReset || new Date(),
      timestamp: new Date().toISOString()
    }
  });
};

/**
 * Reset request statistics
 */
const resetRequestStats = (req, res) => {
  if (req.requestStats) {
    req.requestStats.totalRequests = 0;
    req.requestStats.requestsByMethod = {};
    req.requestStats.requestsByPath = {};
    req.requestStats.averageResponseTime = 0;
    req.requestStats.totalResponseTime = 0;
    req.requestStats.errorCount = 0;
    req.requestStats.lastReset = new Date();
  }
  
  res.json({
    success: true,
    message: 'Request statistics reset',
    timestamp: new Date().toISOString()
  });
};

/**
 * Format uptime in human-readable format
 */
function formatUptime(seconds) {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  
  const parts = [];
  if (days > 0) parts.push(`${days}d`);
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0) parts.push(`${minutes}m`);
  if (secs > 0 || parts.length === 0) parts.push(`${secs}s`);
  
  return parts.join(' ');
}

module.exports = {
  requestIdMiddleware,
  requestTrackingMiddleware,
  requestStatsEndpoint,
  resetRequestStats
};
