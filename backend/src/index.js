const express = require('express');
const rateLimit = require('express-rate-limit');
const routes = require('./api/routes');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());

// Rate limiting
const generalLimiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'),
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100'),
  message: 'Too many requests from this IP, please try again later.'
});

const circuitRunLimiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'),
  max: parseInt(process.env.CIRCUIT_RUN_RATE_LIMIT || '10'),
  message: 'Too many circuit run requests from this IP, please try again later.'
});

app.use('/api', generalLimiter);
app.use('/api/circuit/run', circuitRunLimiter);

// Routes
app.use('/api', routes);

// 404 handler (before global error handler)
app.use((req, res) => {
  res.status(404).json({
    error: 'Not found',
    code: 'NOT_FOUND'
  });
});

// Global error handler (must have 4 parameters for Express to recognize it)
app.use((err, req, res, next) => {
  console.error('Global error handler:', err);

  const isDevelopment = process.env.NODE_ENV === 'development';
  const statusCode = err.statusCode || 500;
  const response = {
    error: err.message || 'Internal server error',
    code: err.code || 'INTERNAL_ERROR'
  };

  if (isDevelopment) {
    response.stack = err.stack;
  }

  res.status(statusCode).json(response);
});

// Start server
app.listen(PORT, () => {
  console.log(`Quantumanic API server running on http://localhost:${PORT}`);
});

module.exports = app;
