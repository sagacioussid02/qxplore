const express = require('express');
const QuantumSimulator = require('../quantum/simulator');
const { isGateSupported } = require('../quantum/gates');

const router = express.Router();

/**
 * POST /api/circuit/run
 * Run a quantum circuit and return the state vector and measurement.
 */
router.post('/circuit/run', (req, res) => {
  try {
    const { numQubits, circuit } = req.body;

    // Validate input
    if (!numQubits || typeof numQubits !== 'number' || numQubits < 1 || numQubits > 2) {
      return res.status(400).json({
        error: 'Invalid numQubits. Must be 1 or 2.'
      });
    }

    if (!circuit || !Array.isArray(circuit.gates)) {
      return res.status(400).json({
        error: 'Invalid circuit. Must include gates array.'
      });
    }

    // Validate gates
    for (const gate of circuit.gates) {
      if (!gate.type) {
        return res.status(400).json({
          error: 'Each gate must have a type.'
        });
      }

      if (!isGateSupported(gate.type)) {
        return res.status(400).json({
          error: `Unsupported gate type: ${gate.type}`
        });
      }

      // Validate gate-specific parameters
      if (gate.type === 'CNOT') {
        if (gate.control === undefined || gate.target === undefined) {
          return res.status(400).json({
            error: 'CNOT gate requires control and target qubits.'
          });
        }
      } else if (['RX', 'RY', 'RZ'].includes(gate.type)) {
        if (gate.angle === undefined || typeof gate.angle !== 'number') {
          return res.status(400).json({
            error: `${gate.type} gate requires an angle parameter (in radians).`
          });
        }
      } else {
        // Single-qubit gates
        if (gate.target === undefined) {
          return res.status(400).json({
            error: `${gate.type} gate requires a target qubit.`
          });
        }
      }
    }

    // Run the circuit
    const simulator = new QuantumSimulator(numQubits);
    const stateVector = simulator.runCircuit(circuit.gates);
    const measurement = simulator.measure();

    res.json({
      stateVector,
      measurement
    });
  } catch (error) {
    console.error('Circuit execution error:', error);
    res.status(500).json({
      error: 'Failed to execute circuit',
      message: error.message
    });
  }
});

/**
 * GET /health
 * Health check endpoint.
 */
router.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

module.exports = router;
