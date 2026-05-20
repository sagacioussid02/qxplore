const express = require('express');
const { simulateCircuit } = require('../quantum/simulator');

const router = express.Router();

// POST /api/circuit/run - Run a quantum circuit
router.post('/circuit/run', (req, res) => {
  try {
    const { numQubits, circuit } = req.body;

    // Validate input
    if (!numQubits || typeof numQubits !== 'number') {
      return res.status(400).json({
        error: 'numQubits must be a positive integer'
      });
    }

    if (!circuit || typeof circuit !== 'object') {
      return res.status(400).json({
        error: 'circuit must be an object'
      });
    }

    if (!Array.isArray(circuit.gates)) {
      return res.status(400).json({
        error: 'circuit.gates must be an array'
      });
    }

    // Validate each gate
    for (const gate of circuit.gates) {
      if (!gate.type || gate.target === undefined) {
        return res.status(400).json({
          error: 'Each gate must have a type and target'
        });
      }
    }

    // Run the simulation
    const result = simulateCircuit(numQubits, circuit);

    res.json(result);
  } catch (error) {
    console.error('Circuit simulation error:', error.message);
    res.status(400).json({
      error: error.message
    });
  }
});

// GET /health - Health check
router.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

module.exports = router;
