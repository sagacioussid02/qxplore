/**
 * Quantum Circuit Simulator
 *
 * This module implements the quantum simulation engine for the Express.js routing layer.
 * It is a prerequisite for the /api/circuit/run endpoint's error handling and response validation.
 *
 * The simulator executes quantum circuits by:
 * 1. Parsing gate definitions (X, H, Z, Y, S, T, CNOT, SWAP, Toffoli)
 * 2. Building the unitary matrix for the circuit
 * 3. Applying the circuit to an initial quantum state
 * 4. Computing measurement probabilities and statevector output
 *
 * Error handling: This module throws JavaScript errors on invalid input or computation failure.
 * The routing layer (routes.js) catches these errors and returns appropriate HTTP status codes.
 */

const math = require('mathjs');

/**
 * Single-qubit gate definitions as unitary matrices.
 */
const SINGLE_QUBIT_GATES = {
  X: [
    [0, 1],
    [1, 0],
  ],
  H: [
    [1 / Math.sqrt(2), 1 / Math.sqrt(2)],
    [1 / Math.sqrt(2), -1 / Math.sqrt(2)],
  ],
  Z: [
    [1, 0],
    [0, -1],
  ],
  Y: [
    [0, math.complex(0, -1)],
    [math.complex(0, 1), 0],
  ],
  S: [
    [1, 0],
    [0, math.complex(0, 1)],
  ],
  T: [
    [1, 0],
    [0, math.exp(math.complex(0, Math.PI / 4))],
  ],
};

/**
 * Pauli matrices for multi-qubit gate construction.
 */
const PAULI_I = [
  [1, 0],
  [0, 1],
];

const PAULI_X = SINGLE_QUBIT_GATES.X;

/**
 * Build a full unitary matrix for a single-qubit gate applied to a specific qubit.
 * @param {string} gateName - Name of the gate (e.g., 'H', 'X')
 * @param {number} targetQubit - Index of the target qubit
 * @param {number} numQubits - Total number of qubits in the circuit
 * @returns {Array} Full unitary matrix
 */
function buildSingleQubitGate(gateName, targetQubit, numQubits) {
  const gateMatrix = SINGLE_QUBIT_GATES[gateName];
  if (!gateMatrix) {
    throw new Error(`Unknown gate: ${gateName}`);
  }

  let fullMatrix = 1;
  for (let i = 0; i < numQubits; i++) {
    if (i === targetQubit) {
      fullMatrix = math.kron(fullMatrix, gateMatrix);
    } else {
      fullMatrix = math.kron(fullMatrix, PAULI_I);
    }
  }
  return fullMatrix;
}

/**
 * Build a CNOT gate (controlled NOT) matrix.
 * @param {number} controlQubit - Index of the control qubit
 * @param {number} targetQubit - Index of the target qubit
 * @param {number} numQubits - Total number of qubits in the circuit
 * @returns {Array} Full unitary matrix
 */
function buildCNOTGate(controlQubit, targetQubit, numQubits) {
  if (controlQubit === targetQubit) {
    throw new Error('CNOT control and target qubits must be different');
  }

  // For simplicity, construct CNOT as a full matrix
  const dim = Math.pow(2, numQubits);
  const cnot = math.zeros(dim, dim);

  for (let i = 0; i < dim; i++) {
    const bitString = i.toString(2).padStart(numQubits, '0');
    const bits = bitString.split('').map(Number);

    let j = i;
    if (bits[controlQubit] === 1) {
      // Flip the target qubit
      bits[targetQubit] = 1 - bits[targetQubit];
      j = parseInt(bits.join(''), 2);
    }

    cnot.set([i, j], 1);
  }

  return cnot;
}

/**
 * Build a SWAP gate matrix.
 * @param {number} qubit1 - Index of the first qubit
 * @param {number} qubit2 - Index of the second qubit
 * @param {number} numQubits - Total number of qubits in the circuit
 * @returns {Array} Full unitary matrix
 */
function buildSWAPGate(qubit1, qubit2, numQubits) {
  if (qubit1 === qubit2) {
    throw new Error('SWAP qubits must be different');
  }

  const dim = Math.pow(2, numQubits);
  const swap = math.zeros(dim, dim);

  for (let i = 0; i < dim; i++) {
    const bitString = i.toString(2).padStart(numQubits, '0');
    const bits = bitString.split('').map(Number);

    // Swap the two qubits
    const temp = bits[qubit1];
    bits[qubit1] = bits[qubit2];
    bits[qubit2] = temp;

    const j = parseInt(bits.join(''), 2);
    swap.set([i, j], 1);
  }

  return swap;
}

/**
 * Build a Toffoli gate (controlled-controlled-NOT) matrix.
 * @param {number} control1 - Index of the first control qubit
 * @param {number} control2 - Index of the second control qubit
 * @param {number} targetQubit - Index of the target qubit
 * @param {number} numQubits - Total number of qubits in the circuit
 * @returns {Array} Full unitary matrix
 */
function buildToffoliGate(control1, control2, targetQubit, numQubits) {
  if (
    control1 === control2 ||
    control1 === targetQubit ||
    control2 === targetQubit
  ) {
    throw new Error('Toffoli qubits must all be different');
  }

  const dim = Math.pow(2, numQubits);
  const toffoli = math.zeros(dim, dim);

  for (let i = 0; i < dim; i++) {
    const bitString = i.toString(2).padStart(numQubits, '0');
    const bits = bitString.split('').map(Number);

    let j = i;
    if (bits[control1] === 1 && bits[control2] === 1) {
      // Flip the target qubit
      bits[targetQubit] = 1 - bits[targetQubit];
      j = parseInt(bits.join(''), 2);
    }

    toffoli.set([i, j], 1);
  }

  return toffoli;
}

/**
 * Run a quantum circuit and return measurement results.
 * @param {Object} circuit - Circuit definition with gates and numQubits
 * @param {number} shots - Number of measurement shots (default: 1024)
 * @returns {Object} Result with counts and statevector
 */
function runCircuit(circuit, shots = 1024) {
  if (!circuit || !circuit.gates || !circuit.numQubits) {
    throw new Error('Invalid circuit definition');
  }

  const { gates, numQubits } = circuit;
  const dim = Math.pow(2, numQubits);

  // Initialize to |0...0⟩ state
  const initialState = math.zeros(dim, 1);
  initialState.set([0, 0], 1);

  let state = initialState;

  // Apply each gate in sequence
  for (const gateObj of gates) {
    const { gate, target, control, control1, control2 } = gateObj;

    let gateMatrix;
    if (gate === 'CNOT' || gate === 'CX') {
      gateMatrix = buildCNOTGate(control, target, numQubits);
    } else if (gate === 'SWAP') {
      gateMatrix = buildSWAPGate(control, target, numQubits);
    } else if (gate === 'Toffoli') {
      gateMatrix = buildToffoliGate(control1, control2, target, numQubits);
    } else {
      gateMatrix = buildSingleQubitGate(gate, target, numQubits);
    }

    state = math.multiply(gateMatrix, state);
  }

  // Extract statevector
  const statevector = state.toArray().flat();

  // Compute measurement probabilities
  const probabilities = statevector.map((amplitude) => {
    const mag = math.abs(amplitude);
    return mag * mag;
  });

  // Sample from the distribution
  const counts = {};
  for (let shot = 0; shot < shots; shot++) {
    let rand = Math.random();
    let cumProb = 0;
    for (let i = 0; i < probabilities.length; i++) {
      cumProb += probabilities[i];
      if (rand <= cumProb) {
        const bitString = i.toString(2).padStart(numQubits, '0');
        counts[bitString] = (counts[bitString] || 0) + 1;
        break;
      }
    }
  }

  return {
    counts,
    statevector: statevector.map((v) =>
      typeof v === 'object' ? { re: v.re, im: v.im } : v
    ),
    shots,
  };
}

module.exports = {
  runCircuit,
};
