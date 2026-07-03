const errorHandler = (err, req, res, _next) => {
  const statusCode =
    err.statusCode && Number.isInteger(err.statusCode)
      ? err.statusCode
      : 500;

  res.status(statusCode).json({
    success: false,
    message: err.message || 'Internal Server Error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
};

export default errorHandler;