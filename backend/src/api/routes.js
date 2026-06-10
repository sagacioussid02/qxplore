const express = require('express');
const simulator = require('../quantum/simulator');

const router = express.Router();

/**
 * POST /api/circuit/run
 * Execute a quantum circuit and return measurement results.
 *
 * Request body:
 * {
 *   "circuit": {
 *     "gates": [
 *       { "gate": "H", "target": 0 },
 *       { "gate": "CNOT", "control": 0, "target": 1 }
 *     ],
 *     "numQubits": 2
 *   },
 *   "shots": 1024
 * }
 *
 * Response (200 OK):
 * {
 *   "counts": { "00": 512, "11": 512 },
 *   "statevector": [0.707, 0, 0, 0.707],
 *   "shots": 1024
 * }
 *
 * Response (400 Bad Request):
 * {
 *   "error": "Missing circuit definition"
 * }
 *
 * Response (500 Internal Server Error):
 * {
 *   "error": "Failed to execute circuit"
 * }
 */
router.post('/circuit/run', (req, res) => {
  const { circuit, shots } = req.body;

  // Validate input
  if (!circuit) {
    return res.status(400).json({ error: 'Missing circuit definition' });
  }

  try {
    // Execute the circuit using the simulator
    const result = simulator.runCircuit(circuit, shots || 1024);

    // Validate response structure
    if (!result || typeof result !== 'object') {
      console.error('Simulator returned non-object response:', result);
      return res.status(500).json({ error: 'Failed to execute circuit' });
    }

    // Ensure required fields are present
    if (!result.counts || !result.statevector) {
      console.error('Simulator response missing required fields:', result);
      return res.status(400).json({ error: 'Invalid circuit response structure' });
    }

    // Return success response
    return res.status(200).json(result);
  } catch (pythonError) {
    // Log the full error server-side for debugging
    console.error('Python engine error:', pythonError.message);

    // Return sanitized error response (no internal details to client)
    return res.status(500).json({ error: 'Failed to execute circuit' });
  }
});

module.exports = router;
