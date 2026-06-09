const express = require('express');
const router = express.Router();

// Mock Python engine endpoint for now
const PYTHON_ENGINE_URL = process.env.PYTHON_ENGINE_URL || 'http://localhost:5000';

/**
 * POST /api/circuit/run
 * Execute a quantum circuit and return measurement results.
 *
 * Request body:
 * {
 *   "circuit": [
 *     { "gate": "H", "target": 0 },
 *     { "gate": "CNOT", "control": 0, "target": 1 },
 *     { "gate": "measure", "targets": [0, 1] }
 *   ],
 *   "numQubits": 2,
 *   "shots": 1000
 * }
 *
 * Response (success):
 * {
 *   "counts": { "00": 500, "11": 500 },
 *   "statevector": [0.707, 0, 0, 0.707],
 *   "executionTime": 1.23
 * }
 *
 * Response (error):
 * {
 *   "error": "<sanitized message>",
 *   "code": "<error code>"
 * }
 */
router.post('/circuit/run', async (req, res) => {
  try {
    const { circuit, numQubits, shots } = req.body;

    // Validate circuit is present
    if (!circuit) {
      return res.status(400).json({
        error: 'Circuit definition is required',
        code: 'MISSING_CIRCUIT'
      });
    }

    // Call Python engine
    let pythonResponse;
    try {
      const fetch = (await import('node-fetch')).default;
      const response = await fetch(`${PYTHON_ENGINE_URL}/simulate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ circuit, numQubits, shots })
      });

      if (!response.ok) {
        return res.status(500).json({
          error: 'Quantum simulation engine unavailable',
          code: 'ENGINE_UNAVAILABLE'
        });
      }

      pythonResponse = await response.json();
    } catch (pythonError) {
      // Log the actual error server-side for debugging
      console.error('Python engine error:', pythonError);
      return res.status(500).json({
        error: 'Quantum simulation engine unavailable',
        code: 'ENGINE_UNAVAILABLE'
      });
    }

    // Validate Python response structure
    if (typeof pythonResponse !== 'object' || pythonResponse === null) {
      console.error('Python engine returned non-object response:', pythonResponse);
      return res.status(500).json({
        error: 'Quantum simulation engine unavailable',
        code: 'ENGINE_UNAVAILABLE'
      });
    }

    // Validate required fields in response
    if (!pythonResponse.counts && !pythonResponse.statevector) {
      console.error('Python engine response missing required fields:', pythonResponse);
      return res.status(400).json({
        error: 'Invalid response from quantum simulation engine',
        code: 'MALFORMED_ENGINE_RESPONSE'
      });
    }

    // Return success response
    return res.status(200).json(pythonResponse);
  } catch (err) {
    console.error('Unexpected error in /circuit/run:', err);
    return res.status(500).json({
      error: 'Internal server error',
      code: 'INTERNAL_ERROR'
    });
  }
});

/**
 * GET /api/health
 * Health check endpoint.
 */
router.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

module.exports = router;
