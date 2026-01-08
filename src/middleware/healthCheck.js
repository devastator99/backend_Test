const { performanceLogger } = require('../utils/logger');

/**
 * Enhanced health check middleware
 * Provides detailed system health information
 */
const healthCheck = async (req, res) => {
  const startTime = Date.now();
  
  try {
    // Check database connection
    let databaseStatus = 'disconnected';
    let databaseLatency = null;
    
    try {
      const dbStart = Date.now();
      await require('../config/database').prisma.$queryRaw`SELECT 1`;
      databaseLatency = Date.now() - dbStart;
      databaseStatus = 'connected';
    } catch (error) {
      databaseStatus = 'error';
      performanceLogger.error('Database health check failed', { error: error.message });
    }
    
    // Check Redis connection (if available)
    let redisStatus = 'disconnected';
    let redisLatency = null;
    
    try {
      const redis = require('ioredis');
      if (process.env.REDIS_URL) {
        const redisClient = new redis(process.env.REDIS_URL);
        const redisStart = Date.now();
        await redisClient.ping();
        redisLatency = Date.now() - redisStart;
        redisStatus = 'connected';
        redisClient.disconnect();
      }
    } catch (error) {
      redisStatus = 'error';
      performanceLogger.error('Redis health check failed', { error: error.message });
    }
    
    // Check file system (uploads directory)
    let fileSystemStatus = 'ok';
    try {
      const fs = require('fs');
      const path = require('path');
      const uploadsDir = path.join(process.cwd(), 'uploads');
      
      if (!fs.existsSync(uploadsDir)) {
        fs.mkdirSync(uploadsDir, { recursive: true });
      }
      
      // Test write access
      const testFile = path.join(uploadsDir, '.health-check');
      fs.writeFileSync(testFile, 'health-check');
      fs.unlinkSync(testFile);
    } catch (error) {
      fileSystemStatus = 'error';
      performanceLogger.error('File system health check failed', { error: error.message });
    }
    
    // Check memory usage
    const memoryUsage = process.memoryUsage();
    const memoryUsagePercent = (memoryUsage.heapUsed / memoryUsage.heapTotal) * 100;
    
    // Check uptime
    const uptime = process.uptime();
    const uptimeFormatted = formatUptime(uptime);
    
    // Overall system status
    const overallStatus = [
      databaseStatus === 'connected',
      redisStatus === 'connected' || redisStatus === 'disconnected', // Redis is optional
      fileSystemStatus === 'ok',
      memoryUsagePercent < 90 // Memory usage below 90%
    ].every(Boolean) ? 'healthy' : 'unhealthy';
    
    const healthData = {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      uptime: uptimeFormatted,
      version: process.env.npm_package_version || '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      
      // Database information
      database: {
        status: databaseStatus,
        latency: databaseLatency ? `${databaseLatency}ms` : null,
        type: process.env.DATABASE_PROVIDER || 'sqlite'
      },
      
      // Redis information (if available)
      cache: {
        status: redisStatus,
        latency: redisLatency ? `${redisLatency}ms` : null,
        type: process.env.REDIS_URL ? 'redis' : 'memory'
      },
      
      // File system information
      fileSystem: {
        status: fileSystemStatus,
        uploadsPath: './uploads',
        writable: fileSystemStatus === 'ok'
      },
      
      // Memory information
      memory: {
        used: `${Math.round(memoryUsage.heapUsed / 1024 / 1024)}MB`,
        total: `${Math.round(memoryUsage.heapTotal / 1024 / 1024)}MB`,
        percentage: `${memoryUsagePercent.toFixed(2)}%`,
        rss: `${Math.round(memoryUsage.rss / 1024 / 1024)}MB`
      },
      
      // Performance information
      performance: {
        responseTime: `${Date.now() - startTime}ms`,
        compression: process.env.COMPRESSION_ENABLED !== 'false' ? 'enabled' : 'disabled',
        rateLimiting: 'enabled'
      }
    };
    
    // Set appropriate status code
    const statusCode = overallStatus === 'healthy' ? 200 : 503;
    
    res.status(statusCode).json({
      success: overallStatus === 'healthy',
      message: overallStatus === 'healthy' 
        ? 'System is operating normally' 
        : 'System experiencing issues',
      data: healthData,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    performanceLogger.error('Health check failed', { error: error.message });
    
    res.status(503).json({
      success: false,
      message: 'Health check failed',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
};

/**
 * Simple health check endpoint for load balancers
 */
const simpleHealthCheck = (req, res) => {
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString()
  });
};

/**
 * Liveness probe for Kubernetes/Docker
 */
const livenessProbe = (req, res) => {
  res.status(200).json({
    status: 'alive',
    timestamp: new Date().toISOString()
  });
};

/**
 * Readiness probe for Kubernetes/Docker
 */
const readinessProbe = async (req, res) => {
  try {
    // Check if essential services are ready
    await require('../config/database').prisma.$queryRaw`SELECT 1`;
    
    res.status(200).json({
      status: 'ready',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(503).json({
      status: 'not ready',
      error: 'Database not available',
      timestamp: new Date().toISOString()
    });
  }
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
  healthCheck,
  simpleHealthCheck,
  livenessProbe,
  readinessProbe
};
