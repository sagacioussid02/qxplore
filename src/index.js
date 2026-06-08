/**
 * Quantumanic - Quantum Circuit Simulator API
 * Express.js server with quantum circuit simulation endpoints
 */

const express = require('express');
const { handleCircuitRun, handleHealth } = require('./api/routes');

const app = express();
const PORT = process.env.PORT || 3000;
const RATE_LIMIT_WINDOW_MS = parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10);
const RATE_LIMIT_MAX_REQUESTS = parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100', 10);
const CIRCUIT_RUN_RATE_LIMIT = parseInt(process.env.CIRCUIT_RUN_RATE_LIMIT || '10', 10);

// Middleware
app.use(express.json());

/**
 * Simple in-memory rate limiter
 * Tracks requests per IP address
 */
class RateLimiter {
  constructor(windowMs, maxRequests) {
    this.windowMs = windowMs;
    this.maxRequests = maxRequests;
    this.requests = new Map();
  }

  isLimited(ip) {
    const now = Date.now();
    if (!this.requests.has(ip)) {
      this.requests.set(ip, []);
    }

    const timestamps = this.requests.get(ip);
    // Remove old timestamps outside the window
    const validTimestamps = timestamps.filter(t => now - t < this.windowMs);
    this.requests.set(ip, validTimestamps);

    if (validTimestamps.length >= this.maxRequests) {
      return true;
    }

    validTimestamps.push(now);
    return false;
  }
}

const generalLimiter = new RateLimiter(RATE_LIMIT_WINDOW_MS, RATE_LIMIT_MAX_REQUESTS);
const circuitRunLimiter = new RateLimiter(RATE_LIMIT_WINDOW_MS, CIRCUIT_RUN_RATE_LIMIT);

/**
 * Rate limiting middleware for general API routes
 */
function generalRateLimit(req, res, next) {
  const ip = req.ip || req.connection.remoteAddress;
  if (generalLimiter.isLimited(ip)) {
    return res.status(429).set('Retry-After', Math.ceil(RATE_LIMIT_WINDOW_MS / 1000)).json({
      error: 'Rate limit exceeded'
    });
  }
  next();
}

/**
 * Rate limiting middleware for circuit run endpoint
 */
function circuitRunRateLimit(req, res, next) {
  const ip = req.ip || req.connection.remoteAddress;
  if (circuitRunLimiter.isLimited(ip)) {
    return res.status(429).set('Retry-After', Math.ceil(RATE_LIMIT_WINDOW_MS / 1000)).json({
      error: 'Rate limit exceeded for circuit execution'
    });
  }
  next();
}

/**
 * Input validation middleware
 */
function validateInput(req, res, next) {
  if (req.method === 'POST' && req.body) {
    // Basic validation that body is an object
    if (typeof req.body !== 'object' || req.body === null) {
      return res.status(400).json({
        error: 'Request body must be a JSON object'
      });
    }
  }
  next();
}

// Routes

/**
 * GET /health
 * Health check endpoint (not rate limited)
 */
app.get('/health', handleHealth);

/**
 * POST /api/circuit/run
 * Run a quantum circuit and return the state vector and measurement outcome
 */
app.post('/api/circuit/run', circuitRunRateLimit, validateInput, handleCircuitRun);

/**
 * Apply general rate limiting to all other /api routes
 */
app.use('/api', generalRateLimit);

/**
 * 404 handler
 */
app.use((req, res) => {
  res.status(404).json({
    error: 'Not found'
  });
});

/**
 * Error handler
 */
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({
    error: 'Internal server error'
  });
});

// Start server
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Quantumanic server running on http://localhost:${PORT}`);
  });
}

module.exports = app;
