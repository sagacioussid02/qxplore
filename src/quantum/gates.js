const math = require('mathjs');

/**
 * Quantum gate definitions with unitary matrices.
 * All matrices are validated against standard quantum computing references.
 */

const gates = {
  // Single-qubit Pauli gates
  X: {
    name: 'Pauli-X (NOT)',
    matrix: [
      [0, 1],
      [1, 0]
    ]
  },
  Y: {
    name: 'Pauli-Y',
    matrix: [
      [0, math.complex(0, -1)],
      [math.complex(0, 1), 0]
    ]
  },
  Z: {
    name: 'Pauli-Z',
    matrix: [
      [1, 0],
      [0, -1]
    ]
  },
  H: {
    name: 'Hadamard',
    matrix: [
      [1 / Math.sqrt(2), 1 / Math.sqrt(2)],
      [1 / Math.sqrt(2), -1 / Math.sqrt(2)]
    ]
  },
  S: {
    name: 'Phase (S gate)',
    matrix: [
      [1, 0],
      [0, math.complex(0, 1)]
    ]
  },
  T: {
    name: 'T gate',
    matrix: [
      [1, 0],
      [0, math.exp(math.complex(0, Math.PI / 4))]
    ]
  },
  // Parameterized rotation gates
  RX: {
    name: 'Rotation around X-axis',
    matrix: (theta) => [
      [Math.cos(theta / 2), math.complex(0, -Math.sin(theta / 2))],
      [math.complex(0, -Math.sin(theta / 2)), Math.cos(theta / 2)]
    ]
  },
  RY: {
    name: 'Rotation around Y-axis',
    matrix: (theta) => [
      [Math.cos(theta / 2), -Math.sin(theta / 2)],
      [Math.sin(theta / 2), Math.cos(theta / 2)]
    ]
  },
  RZ: {
    name: 'Rotation around Z-axis',
    matrix: (theta) => [
      [math.exp(math.complex(0, -theta / 2)), 0],
      [0, math.exp(math.complex(0, theta / 2))]
    ]
  },
  // Two-qubit gates
  CNOT: {
    name: 'Controlled-NOT',
    matrix: [
      [1, 0, 0, 0],
      [0, 1, 0, 0],
      [0, 0, 0, 1],
      [0, 0, 1, 0]
    ],
    qubits: 2
  }
};

/**
 * Get the unitary matrix for a gate.
 * For parameterized gates (RX, RY, RZ), theta must be provided.
 *
 * @param {string} gateType - Gate type (e.g., 'X', 'H', 'RX')
 * @param {number} theta - Rotation angle in radians (required for RX, RY, RZ)
 * @returns {Array} Unitary matrix
 */
function getGateMatrix(gateType, theta) {
  const gate = gates[gateType];
  if (!gate) {
    throw new Error(`Unknown gate type: ${gateType}`);
  }

  if (typeof gate.matrix === 'function') {
    if (theta === undefined) {
      throw new Error(`Gate ${gateType} requires a rotation angle (theta)`);
    }
    return gate.matrix(theta);
  }

  return gate.matrix;
}

/**
 * Check if a gate is single-qubit or multi-qubit.
 *
 * @param {string} gateType - Gate type
 * @returns {number} Number of qubits the gate operates on
 */
function getGateQubits(gateType) {
  const gate = gates[gateType];
  if (!gate) {
    throw new Error(`Unknown gate type: ${gateType}`);
  }
  return gate.qubits || 1;
}

module.exports = {
  gates,
  getGateMatrix,
  getGateQubits
};
