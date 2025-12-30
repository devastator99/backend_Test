const winston = require('winston');
const path = require('path');

const logLevels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4,
};

const logColors = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  http: 'magenta',
  debug: 'white',
};

winston.addColors(logColors);

const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss:ms' }),
  winston.format.colorize({ all: true }),
  winston.format.printf(
    (info) => `${info.timestamp} ${info.level}: ${info.message}`
  )
);

const transports = [
  new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize(),
      winston.format.simple()
    ),
  }),
  new winston.transports.File({
    filename: path.join(process.cwd(), 'logs', 'error.log'),
    level: 'error',
    format: winston.format.combine(
      winston.format.timestamp(),
      winston.format.json()
    ),
  }),
  new winston.transports.File({
    filename: path.join(process.cwd(), 'logs', 'combined.log'),
    format: winston.format.combine(
      winston.format.timestamp(),
      winston.format.json()
    ),
  }),
];

if (process.env.NODE_ENV === 'production') {
  transports.push(
    new winston.transports.File({
      filename: path.join(process.cwd(), 'logs', 'http.log'),
      level: 'http',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
      ),
    })
  );
}

const logger = winston.createLogger({
  level: process.env.NODE_ENV === 'development' ? 'debug' : 'info',
  levels: logLevels,
  format: logFormat,
  transports,
  exitOnError: false,
});

logger.stream = {
  write: (message) => {
    logger.http(message.trim());
  },
};

const requestLogger = (req, res, next) => {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    const logData = {
      method: req.method,
      url: req.originalUrl,
      status: res.statusCode,
      duration: `${duration}ms`,
      ip: req.ip || req.connection.remoteAddress,
      userAgent: req.get('User-Agent'),
      contentLength: res.get('Content-Length'),
    };

    if (res.statusCode >= 400) {
      logger.error('HTTP Request Error', logData);
    } else {
      logger.http('HTTP Request', logData);
    }
  });

  next();
};

const errorLogger = (err, req, res, next) => {
  logger.error('Application Error', {
    message: err.message,
    stack: err.stack,
    url: req.originalUrl,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    body: req.body,
    params: req.params,
    query: req.query,
  });

  next(err);
};

const performanceLogger = (req, res, next) => {
  const start = process.hrtime();
  
  res.on('finish', () => {
    const [seconds, nanoseconds] = process.hrtime(start);
    const milliseconds = (seconds * 1000) + (nanoseconds / 1000000);
    
    if (milliseconds > 1000) {
      logger.warn('Slow Request Detected', {
        url: req.originalUrl,
        method: req.method,
        duration: `${milliseconds.toFixed(2)}ms`,
        status: res.statusCode,
      });
    }
  });

  next();
};

const securityLogger = {
  logFailedLogin: (email, ip, userAgent) => {
    logger.warn('Failed Login Attempt', {
      email,
      ip,
      userAgent,
      timestamp: new Date().toISOString(),
    });
  },

  logSuspiciousActivity: (activity, details) => {
    logger.warn('Suspicious Activity Detected', {
      activity,
      details,
      timestamp: new Date().toISOString(),
    });
  },

  logRateLimitExceeded: (ip, endpoint) => {
    logger.warn('Rate Limit Exceeded', {
      ip,
      endpoint,
      timestamp: new Date().toISOString(),
    });
  },

  logUnauthorizedAccess: (ip, endpoint, userAgent) => {
    logger.warn('Unauthorized Access Attempt', {
      ip,
      endpoint,
      userAgent,
      timestamp: new Date().toISOString(),
    });
  },
};

const databaseLogger = {
  logQuery: (query, duration, params) => {
    if (process.env.NODE_ENV === 'development') {
      logger.debug('Database Query', {
        query: query.substring(0, 200),
        duration: `${duration}ms`,
        params,
      });
    }
  },

  logConnectionError: (error) => {
    logger.error('Database Connection Error', {
      error: error.message,
      stack: error.stack,
    });
  },

  logTransaction: (operation, duration, success) => {
    logger.info('Database Transaction', {
      operation,
      duration: `${duration}ms`,
      success,
    });
  },
};

module.exports = {
  logger,
  requestLogger,
  errorLogger,
  performanceLogger,
  securityLogger,
  databaseLogger,
};
