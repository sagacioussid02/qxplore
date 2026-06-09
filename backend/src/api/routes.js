const express = require('express');
const router = express.Router();
const simulator = require('../quantum/simulator');

// Health check endpoint
router.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

// Circuit execution endpoint
router.post('/circuit/run', async (req, res, next) => {
  try {
    const { circuit, shots = 1024 } = req.body;

    // Validate input
    if (!circuit) {
      return res.status(400).json({
        error: 'Missing circuit definition',
        code: 'INVALID_INPUT'
      });
    }

    // Call Python simulation engine
    let result;
    try {
      result = await simulator.run(circuit, shots);
    } catch (pythonError) {
      // Python engine is unreachable or crashed
      console.error('Python engine error:', pythonError.message);
      return res.status(500).json({
        error: 'Quantum simulation engine unavailable',
        code: 'ENGINE_UNAVAILABLE',
        details: pythonError.message
      });
    }

    // Validate Python response structure
    if (!result || typeof result !== 'object') {
      console.error('Invalid Python response: not an object', result);
      return res.status(500).json({
        error: 'Invalid response from quantum simulation engine',
        code: 'INVALID_ENGINE_RESPONSE'
      });
    }

    if (!result.counts && !result.statevector) {
      console.error('Invalid Python response: missing counts or statevector', result);
      return res.status(400).json({
        error: 'Malformed response from quantum simulation engine',
        code: 'MALFORMED_ENGINE_RESPONSE',
        details: 'Response must include counts or statevector'
      });
    }

    // Return successful result
    res.status(200).json({
      success: true,
      result: result,
      shots: shots
    });
  } catch (error) {
    // Catch any unexpected errors and pass to global error handler
    next(error);
  }
});

module.exports = router;
