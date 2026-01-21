class AppError extends Error {
  constructor(message, statusCode, isOperational = true) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';

    Error.captureStackTrace(this, this.constructor);
  }
}

class ValidationError extends AppError {
  constructor(message, errors = []) {
    super(message, 400);
    this.errors = errors;
    this.name = 'ValidationError';
  }
}

class NotFoundError extends AppError {
  constructor(resource = 'Resource') {
    super(`${resource} not found`, 404);
    this.name = 'NotFoundError';
  }
}

class UnauthorizedError extends AppError {
  constructor(message = 'Authentication required') {
    super(message, 401);
    this.name = 'UnauthorizedError';
  }
}

class ForbiddenError extends AppError {
  constructor(message = 'Insufficient permissions') {
    super(message, 403);
    this.name = 'ForbiddenError';
  }
}

class ConflictError extends AppError {
  constructor(message = 'Resource already exists') {
    super(message, 409);
    this.name = 'ConflictError';
  }
}

class DatabaseError extends AppError {
  constructor(message = 'Database operation failed') {
    super(message, 500);
    this.name = 'DatabaseError';
  }
}

class RateLimitError extends AppError {
  constructor(message = 'Too many requests') {
    super(message, 429);
    this.name = 'RateLimitError';
  }
}

class FileUploadError extends AppError {
  constructor(message = 'File upload failed') {
    super(message, 400);
    this.name = 'FileUploadError';
  }
}

const handlePrismaError = (error) => {
  switch (error.code) {
    case 'P2002':
      return new ConflictError('Resource already exists');
    case 'P2025':
      return new NotFoundError('Record not found');
    case 'P2003':
      return new ValidationError('Foreign key constraint violation');
    case 'P2014':
      return new ValidationError('Invalid relation');
    default:
      return new DatabaseError('Database operation failed');
  }
};

const handleCastErrorDB = (err) => {
  const message = `Invalid ${err.path}: ${err.value}`;
  return new ValidationError(message);
};

const handleDuplicateFieldsDB = (err) => {
  const value = err.errmsg.match(/(["'])(\\?.)*?\1/)[0];
  const message = `Duplicate field value: ${value}. Please use another value!`;
  return new ConflictError(message);
};

const sendErrorDev = (err, req, res) => {
  return res.status(err.statusCode).json({
    success: false,
    error: {
      name: err.name,
      message: err.message,
      stack: err.stack,
    },
    timestamp: new Date().toISOString(),
  });
};

const sendErrorProd = (err, req, res) => {
  if (err.isOperational) {
    return res.status(err.statusCode).json({
      success: false,
      message: err.message,
      timestamp: new Date().toISOString(),
    });
  }

  console.error('ERROR 💥', err);
  return res.status(500).json({
    success: false,
    message: 'Internal server error',
    timestamp: new Date().toISOString(),
  });
};

const globalErrorHandler = (err, req, res, next) => {
  err.statusCode = err.statusCode || 500;
  err.status = err.status || 'error';

  if (process.env.NODE_ENV === 'development') {
    sendErrorDev(err, req, res);
  } else {
    let error = { ...err };
    error.message = err.message;

    if (error.name === 'CastError') error = handleCastErrorDB(error);
    if (error.code === 11000) error = handleDuplicateFieldsDB(error);
    if (error.name === 'ValidationError') error = new ValidationError(error.message);
    if (error.code && error.code.startsWith('P')) error = handlePrismaError(error);

    sendErrorProd(error, req, res);
  }
};

module.exports = {
  AppError,
  ValidationError,
  NotFoundError,
  UnauthorizedError,
  ForbiddenError,
  ConflictError,
  DatabaseError,
  RateLimitError,
  FileUploadError,
  handlePrismaError,
  globalErrorHandler,
};
