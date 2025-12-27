const morgan = require('morgan');

const requestLogger = morgan((tokens, req, res) => {
  return JSON.stringify({
    method: tokens.method(req, res),
    url: tokens.url(req, res),
    status: tokens.status(req, res),
    contentLength: tokens.res(req, res, 'content-length'),
    responseTime: tokens['response-time'](req, res),
    timestamp: new Date().toISOString(),
    ip: req.ip || req.connection.remoteAddress,
    userAgent: req.get('User-Agent'),
  });
});

module.exports = requestLogger;
