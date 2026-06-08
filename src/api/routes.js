/**
 * API route handlers for quantum circuit simulation.
 */

const { runCircuit } = require('../quantum/simulator');
const { validateGateInstruction } = require('../quantum/gates');

/**
 * POST /api/circuit/run
 * Run a quantum circuit and return the state vector and measurement outcome.
 *
 * Request schema:
 * {
 *   "numQubits": number (1-10),
 *   "circuit": {
 *     "gates": [
 *       {
 *         "type": "X" | "H" | "Z" | "Y" | "S" | "T" | "CNOT" | "SWAP" | "Toffoli",
 *         "target": number (for single-qubit gates),
 *         "control": number, "target": number (for two-qubit gates),
 *         "control1": number, "control2": number, "target": number (for three-qubit gates)
 *       }
 *     ]
 *   }
 * }
 *
 * Response schema:
 * {
 *   "stateVector": [number | {re: number, im: number}, ...],
 *   "measurement": [0 | 1, ...]
 * }
 */
function handleCircuitRun(req, res) {
  try {
    const { numQubits, circuit } = req.body;

    // Validate input
    if (!numQubits || !Number.isInteger(numQubits) || numQubits < 1 || numQubits > 10) {
      return res.status(400).json({
        error: 'numQubits must be an integer between 1 and 10'
      });
    }

    if (!circuit || !Array.isArray(circuit.gates)) {
      return res.status(400).json({
        error: 'circuit.gates must be an array'
      });
    }

    // Validate each gate instruction
    for (const instruction of circuit.gates) {
      const validation = validateGateInstruction(instruction);
      if (!validation.valid) {
        return res.status(400).json({
          error: validation.error
        });
      }

      // Check that qubit indices are within range
      const maxQubit = Math.max(
        instruction.target !== undefined ? instruction.target : -1,
        instruction.control !== undefined ? instruction.control : -1,
        instruction.control1 !== undefined ? instruction.control1 : -1,
        instruction.control2 !== undefined ? instruction.control2 : -1
      );

      if (maxQubit >= numQubits) {
        return res.status(400).json({
          error: `Qubit index ${maxQubit} out of range for ${numQubits} qubits`
        });
      }
    }

    // Run the circuit
    const result = runCircuit(numQubits, circuit);

    return res.json(result);
  } catch (error) {
    console.error('Circuit execution error:', error);
    return res.status(500).json({
      error: 'Internal server error during circuit execution'
    });
  }
}

/**
 * GET /health
 * Health check endpoint.
 */
function handleHealth(req, res) {
  return res.json({ status: 'ok' });
}

module.exports = {
  handleCircuitRun,
  handleHealth
};
