const errorHandler = (err, req, res, next) => {
  console.error(err.stack);

  if (err.name === 'ValidationError') {
    return res.status(400).json({
      success: false,
      message: 'Validation Error',
      errors: err.errors,
    });
  }

  if (err.code === 'P2002') {
    return res.status(409).json({
      success: false,
      message: 'Resource already exists',
    });
  }

  if (err.code === 'P2025') {
    return res.status(404).json({
      success: false,
      message: 'Resource not found',
    });
  }

  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal Server Error',
  });
};

module.exports = errorHandler;
