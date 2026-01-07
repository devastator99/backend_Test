const compression = require('compression');
const { performanceLogger } = require('../utils/logger');

/**
 * Compression middleware configuration
 * Implements gzip/deflate compression for API responses
 */
const compressionConfig = {
  // Compression level (1-9, where 9 is highest compression)
  level: 6,
  
  // Threshold for compression (only compress responses larger than this)
  threshold: 1024, // 1KB
  
  // Content types to compress
  filter: (req, res) => {
    if (req.headers['x-no-compression']) {
      // Don't compress if client explicitly requests no compression
      return false;
    }
    
    // Only compress compressible content types
    const contentType = res.getHeader('content-type');
    const compressibleTypes = [
      'text/',
      'application/json',
      'application/javascript',
      'application/xml',
      'application/xml+rss',
      'application/atom+xml',
      'image/svg+xml',
      'application/x-font-ttf',
      'application/x-font-opentype',
      'application/vnd.ms-fontobject',
      'image/x-icon'
    ];
    
    return compressibleTypes.some(type => 
      contentType && contentType.includes(type)
    );
  },
  
  // Compression window size
  windowBits: 15,
  
  // Memory level (1-9)
  memLevel: 8,
  
  // Strategy for compression
  strategy: 0, // compression.strategies.DEFAULT
  
  // Chunk size for compression
  chunkSize: 16 * 1024, // 16KB
};

/**
 * Enhanced compression middleware with logging
 */
const compressionMiddleware = compression(compressionConfig);

/**
 * Compression middleware wrapper with performance monitoring
 */
const compressionWithLogging = (req, res, next) => {
  const startTime = Date.now();
  const originalSize = parseInt(res.getHeader('content-length') || '0');
  
  // Track compression metrics
  const originalWrite = res.write;
  const originalEnd = res.end;
  
  let compressedSize = 0;
  
  res.write = function(chunk, encoding) {
    if (chunk) {
      compressedSize += Buffer.byteLength(chunk, encoding);
    }
    return originalWrite.call(this, chunk, encoding);
  };
  
  res.end = function(chunk, encoding) {
    if (chunk) {
      compressedSize += Buffer.byteLength(chunk, encoding);
    }
    
    const endTime = Date.now();
    const compressionTime = endTime - startTime;
    
    // Log compression metrics
    if (originalSize > 0 && compressedSize > 0) {
      const compressionRatio = ((originalSize - compressedSize) / originalSize * 100).toFixed(2);
      
      performanceLogger.info('Response compression metrics', {
        url: req.url,
        method: req.method,
        originalSize: `${(originalSize / 1024).toFixed(2)}KB`,
        compressedSize: `${(compressedSize / 1024).toFixed(2)}KB`,
        compressionRatio: `${compressionRatio}%`,
        compressionTime: `${compressionTime}ms`,
        contentType: res.getHeader('content-type'),
        userAgent: req.headers['user-agent']
      });
    }
    
    return originalEnd.call(this, chunk, encoding);
  };
  
  compressionMiddleware(req, res, next);
};

/**
 * Selective compression middleware
 * Only compress specific routes or conditions
 */
const selectiveCompression = (options = {}) => {
  const {
    enabled = true,
    excludeRoutes = ['/health', '/metrics', '/api-docs'],
    includeRoutes = [],
    minSize = 1024
  } = options;
  
  return (req, res, next) => {
    // Skip compression if disabled
    if (!enabled) {
      return next();
    }
    
    // Check if route should be excluded
    if (excludeRoutes.some(route => req.path.startsWith(route))) {
      return next();
    }
    
    // Check if route should be included (if specified)
    if (includeRoutes.length > 0 && !includeRoutes.some(route => req.path.startsWith(route))) {
      return next();
    }
    
    // Apply compression
    compressionWithLogging(req, res, next);
  };
};

/**
 * Brotli compression middleware (if available)
 * Falls back to gzip if brotli not supported
 */
const brotliCompression = (req, res, next) => {
  const acceptEncoding = req.headers['accept-encoding'] || '';
  
  // Check if client supports brotli
  if (acceptEncoding.includes('br')) {
    // Use brotli if available (requires additional package)
    res.setHeader('Content-Encoding', 'br');
    // Note: This would require the 'iltorb' or 'brotli' package
    // For now, fall back to gzip
  }
  
  compressionWithLogging(req, res, next);
};

/**
 * Compression middleware for static assets
 * Optimized for serving compressed static files
 */
const staticCompression = compression({
  level: 9, // Maximum compression for static files
  threshold: 512, // Compress smaller files for static assets
  filter: (req, res) => {
    const contentType = res.getHeader('content-type');
    const staticTypes = [
      'text/css',
      'text/javascript',
      'application/javascript',
      'image/svg+xml',
      'application/json'
    ];
    
    return staticTypes.some(type => 
      contentType && contentType.includes(type)
    );
  }
});

/**
 * API-specific compression middleware
 * Optimized for API responses
 */
const apiCompression = compression({
  level: 6,
  threshold: 1024,
  filter: (req, res) => {
    // Only compress API responses
    if (!req.path.startsWith('/api')) {
      return false;
    }
    
    const contentType = res.getHeader('content-type');
    return contentType && contentType.includes('application/json');
  }
});

/**
 * Compression statistics middleware
 * Tracks compression performance metrics
 */
const compressionStats = {
  totalRequests: 0,
  compressedResponses: 0,
  totalOriginalSize: 0,
  totalCompressedSize: 0,
  totalCompressionTime: 0,
  
  record(originalSize, compressedSize, compressionTime) {
    this.totalRequests++;
    this.totalOriginalSize += originalSize;
    this.totalCompressedSize += compressedSize;
    this.totalCompressionTime += compressionTime;
    
    if (compressedSize < originalSize) {
      this.compressedResponses++;
    }
  },
  
  getStats() {
    const avgCompressionRatio = this.totalOriginalSize > 0 
      ? ((this.totalOriginalSize - this.totalCompressedSize) / this.totalOriginalSize * 100).toFixed(2)
      : 0;
    
    const avgCompressionTime = this.totalRequests > 0
      ? (this.totalCompressionTime / this.totalRequests).toFixed(2)
      : 0;
    
    return {
      totalRequests: this.totalRequests,
      compressedResponses: this.compressedResponses,
      compressionRate: `${((this.compressedResponses / this.totalRequests) * 100).toFixed(2)}%`,
      avgCompressionRatio: `${avgCompressionRatio}%`,
      avgCompressionTime: `${avgCompressionTime}ms`,
      totalBandwidthSaved: `${((this.totalOriginalSize - this.totalCompressedSize) / 1024 / 1024).toFixed(2)}MB`
    };
  },
  
  reset() {
    this.totalRequests = 0;
    this.compressedResponses = 0;
    this.totalOriginalSize = 0;
    this.totalCompressedSize = 0;
    this.totalCompressionTime = 0;
  }
};

/**
 * Middleware to add compression headers
 */
const compressionHeaders = (req, res, next) => {
  // Add compression-related headers
  res.setHeader('Vary', 'Accept-Encoding');
  res.setHeader('Cache-Control', 'public, max-age=31536000'); // 1 year for compressed content
  
  next();
};

module.exports = {
  compressionMiddleware,
  compressionWithLogging,
  selectiveCompression,
  brotliCompression,
  staticCompression,
  apiCompression,
  compressionStats,
  compressionHeaders,
  compressionConfig
};
