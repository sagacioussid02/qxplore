const math = require('mathjs');

// Define quantum gates as unitary matrices
const gates = {
  // Pauli X gate (NOT gate)
  X: {
    matrix: [
      [0, 1],
      [1, 0]
    ],
    description: 'Pauli X gate (NOT)'
  },

  // Hadamard gate
  H: {
    matrix: [
      [1 / Math.sqrt(2), 1 / Math.sqrt(2)],
      [1 / Math.sqrt(2), -1 / Math.sqrt(2)]
    ],
    description: 'Hadamard gate'
  },

  // Pauli Z gate
  Z: {
    matrix: [
      [1, 0],
      [0, -1]
    ],
    description: 'Pauli Z gate'
  },

  // Pauli Y gate
  Y: {
    matrix: [
      [0, math.complex(0, -1)],
      [math.complex(0, 1), 0]
    ],
    description: 'Pauli Y gate'
  },

  // S gate (phase gate)
  S: {
    matrix: [
      [1, 0],
      [0, math.complex(0, 1)]
    ],
    description: 'S gate (phase gate)'
  },

  // T gate
  T: {
    matrix: [
      [1, 0],
      [0, math.exp(math.complex(0, Math.PI / 4))]
    ],
    description: 'T gate'
  }
};

module.exports = gates;
