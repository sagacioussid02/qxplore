const express = require('express');
const rateLimit = require('express-rate-limit');
const validateContractMiddleware = require('./middleware/validateContract');
const routes = require('./api/routes');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());

// Contract validation middleware
app.use(validateContractMiddleware);

// Rate limiting
const generalLimiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
  message: 'Too many requests from this IP, please try again later.'
});

const circuitRunLimiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
  max: parseInt(process.env.CIRCUIT_RUN_RATE_LIMIT) || 10,
  message: 'Too many circuit run requests from this IP, please try again later.'
});

app.use('/api/', generalLimiter);
app.use('/api/circuit/run', circuitRunLimiter);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString()
  });
});

// Circuit run endpoint
app.post('/api/circuit/run', (req, res) => {
  try {
    const { gates, qubits, shots = 1000 } = req.body;

    // Simulate circuit execution
    // This is a placeholder; actual quantum simulation would happen here
    const results = {};
    const totalOutcomes = Math.pow(2, qubits);
    for (let i = 0; i < totalOutcomes; i++) {
      const bitstring = i.toString(2).padStart(qubits, '0');
      results[bitstring] = Math.random();
    }

    // Normalize probabilities
    const sum = Object.values(results).reduce((a, b) => a + b, 0);
    Object.keys(results).forEach(key => {
      results[key] = results[key] / sum;
    });

    const startTime = Date.now();
    const executionTime = Date.now() - startTime;

    res.json({
      results,
      shots,
      execution_time_ms: executionTime
    });
  } catch (error) {
    console.error('Circuit execution error:', error);
    res.status(500).json({
      error: 'Circuit execution failed',
      code: 'EXECUTION_ERROR',
      details: { message: error.message }
    });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({
    error: 'Internal server error',
    code: 'INTERNAL_ERROR',
    details: { message: err.message }
  });
});

app.listen(PORT, () => {
  console.log(`Quantumanic API server running on port ${PORT}`);
});

module.exports = app;
