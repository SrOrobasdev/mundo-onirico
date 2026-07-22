class AppError extends Error {
  constructor(message, statusCode = 500) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;
  }
}

const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

const errorHandler = (err, req, res, next) => {
  if (err.isOperational) {
    return res.status(err.statusCode).json({ error: err.message });
  }
  if (err.name === 'ValidationError') {
    const msgs = Object.values(err.errors).map(e => e.message).join(', ');
    return res.status(400).json({ error: msgs });
  }
  if (err.name === 'CastError') {
    return res.status(400).json({ error: 'ID inválido' });
  }
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Error interno del servidor' });
};

module.exports = { AppError, asyncHandler, errorHandler };
