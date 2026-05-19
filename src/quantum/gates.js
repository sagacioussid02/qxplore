const math = require('mathjs');

/**
 * Quantum gate definitions with unitary matrices.
 * All matrices are validated against standard quantum computing references.
 */

const gates = {
  // Single-qubit Pauli gates
  X: {
    matrix: [
      [0, 1],
      [1, 0]
    ],
    qubits: 1,
    description: 'Pauli-X (NOT) gate'
  },
  Y: {
    matrix: [
      [0, math.complex(0, -1)],
      [math.complex(0, 1), 0]
    ],
    qubits: 1,
    description: 'Pauli-Y gate'
  },
  Z: {
    matrix: [
      [1, 0],
      [0, -1]
    ],
    qubits: 1,
    description: 'Pauli-Z gate'
  },
  H: {
    matrix: [
      [1 / Math.sqrt(2), 1 / Math.sqrt(2)],
      [1 / Math.sqrt(2), -1 / Math.sqrt(2)]
    ],
    qubits: 1,
    description: 'Hadamard gate'
  },
  // Phase gates
  S: {
    matrix: [
      [1, 0],
      [0, math.complex(0, 1)]
    ],
    qubits: 1,
    description: 'S (phase) gate'
  },
  T: {
    matrix: [
      [1, 0],
      [0, math.exp(math.complex(0, Math.PI / 4))]
    ],
    qubits: 1,
    description: 'T gate'
  },
  // Rotation gates (parameterized by angle in radians)
  RX: {
    qubits: 1,
    parameterized: true,
    description: 'RX rotation gate (angle in radians)',
    matrix: (angle) => [
      [Math.cos(angle / 2), math.complex(0, -Math.sin(angle / 2))],
      [math.complex(0, -Math.sin(angle / 2)), Math.cos(angle / 2)]
    ]
  },
  RY: {
    qubits: 1,
    parameterized: true,
    description: 'RY rotation gate (angle in radians)',
    matrix: (angle) => [
      [Math.cos(angle / 2), -Math.sin(angle / 2)],
      [Math.sin(angle / 2), Math.cos(angle / 2)]
    ]
  },
  RZ: {
    qubits: 1,
    parameterized: true,
    description: 'RZ rotation gate (angle in radians)',
    matrix: (angle) => [
      [math.exp(math.complex(0, -angle / 2)), 0],
      [0, math.exp(math.complex(0, angle / 2))]
    ]
  },
  // Two-qubit gates
  CNOT: {
    matrix: [
      [1, 0, 0, 0],
      [0, 1, 0, 0],
      [0, 0, 0, 1],
      [0, 0, 1, 0]
    ],
    qubits: 2,
    description: 'CNOT (controlled-NOT) gate'
  }
};

/**
 * Get the unitary matrix for a gate.
 * For parameterized gates, pass the angle parameter.
 *
 * @param {string} gateType - Gate name (e.g., 'X', 'RX')
 * @param {number} [angle] - Angle in radians for parameterized gates
 * @returns {Array} Unitary matrix
 */
function getGateMatrix(gateType, angle) {
  const gate = gates[gateType];
  if (!gate) {
    throw new Error(`Unknown gate type: ${gateType}`);
  }
  if (gate.parameterized) {
    if (angle === undefined) {
      throw new Error(`Gate ${gateType} requires an angle parameter`);
    }
    return gate.matrix(angle);
  }
  return gate.matrix;
}

/**
 * Check if a gate is supported.
 *
 * @param {string} gateType - Gate name
 * @returns {boolean}
 */
function isGateSupported(gateType) {
  return gateType in gates;
}

/**
 * Get gate metadata.
 *
 * @param {string} gateType - Gate name
 * @returns {Object} Gate metadata
 */
function getGateInfo(gateType) {
  return gates[gateType];
}

module.exports = {
  gates,
  getGateMatrix,
  isGateSupported,
  getGateInfo
};
