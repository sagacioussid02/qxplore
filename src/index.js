const express = require('express');
const rateLimit = require('express-rate-limit');
const routes = require('./api/routes');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());

// Rate limiting configuration
const defaultLimiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10), // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100', 10),
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
});

const circuitRunLimiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10), // 15 minutes
  max: parseInt(process.env.CIRCUIT_RUN_RATE_LIMIT || '10', 10),
  message: 'Too many circuit run requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

// Apply default rate limiter to all /api routes
app.use('/api/', defaultLimiter);

// Apply stricter rate limiter to the compute-heavy circuit run endpoint
app.post('/api/circuit/run', circuitRunLimiter);

// Routes
app.use('/api', routes);

// Health check endpoint (no rate limit)
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

module.exports = app;
