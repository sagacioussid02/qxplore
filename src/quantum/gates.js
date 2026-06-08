/**
 * Quantum gate definitions and unitary matrices.
 * Supports single-qubit and multi-qubit gates.
 */

const math = require('mathjs');

/**
 * Single-qubit Pauli X gate (NOT gate)
 */
const X = {
  name: 'X',
  qubits: 1,
  matrix: [
    [0, 1],
    [1, 0]
  ]
};

/**
 * Single-qubit Hadamard gate
 */
const H = {
  name: 'H',
  qubits: 1,
  matrix: [
    [1 / Math.sqrt(2), 1 / Math.sqrt(2)],
    [1 / Math.sqrt(2), -1 / Math.sqrt(2)]
  ]
};

/**
 * Single-qubit Pauli Z gate
 */
const Z = {
  name: 'Z',
  qubits: 1,
  matrix: [
    [1, 0],
    [0, -1]
  ]
};

/**
 * Single-qubit Pauli Y gate
 */
const Y = {
  name: 'Y',
  qubits: 1,
  matrix: [
    [0, new math.Complex(0, -1)],
    [new math.Complex(0, 1), 0]
  ]
};

/**
 * Single-qubit S gate (phase gate)
 */
const S = {
  name: 'S',
  qubits: 1,
  matrix: [
    [1, 0],
    [0, new math.Complex(0, 1)]
  ]
};

/**
 * Single-qubit T gate
 */
const T = {
  name: 'T',
  qubits: 1,
  matrix: [
    [1, 0],
    [0, new math.Complex(Math.cos(Math.PI / 4), Math.sin(Math.PI / 4))]
  ]
};

/**
 * Two-qubit CNOT gate (controlled-NOT, CX)
 * Control qubit flips target qubit if control is |1⟩
 * Unitary matrix in computational basis |00⟩, |01⟩, |10⟩, |11⟩
 */
const CNOT = {
  name: 'CNOT',
  qubits: 2,
  matrix: [
    [1, 0, 0, 0],
    [0, 1, 0, 0],
    [0, 0, 0, 1],
    [0, 0, 1, 0]
  ]
};

/**
 * Alias for CNOT gate
 */
const CX = CNOT;

/**
 * Two-qubit SWAP gate
 * Exchanges the state of two qubits
 * Unitary matrix in computational basis |00⟩, |01⟩, |10⟩, |11⟩
 */
const SWAP = {
  name: 'SWAP',
  qubits: 2,
  matrix: [
    [1, 0, 0, 0],
    [0, 0, 1, 0],
    [0, 1, 0, 0],
    [0, 0, 0, 1]
  ]
};

/**
 * Three-qubit Toffoli gate (controlled-controlled-NOT, CCX)
 * Flips target qubit if both control qubits are |1⟩
 * Unitary matrix in computational basis |000⟩ through |111⟩
 */
const Toffoli = {
  name: 'Toffoli',
  qubits: 3,
  matrix: [
    [1, 0, 0, 0, 0, 0, 0, 0],
    [0, 1, 0, 0, 0, 0, 0, 0],
    [0, 0, 1, 0, 0, 0, 0, 0],
    [0, 0, 0, 1, 0, 0, 0, 0],
    [0, 0, 0, 0, 1, 0, 0, 0],
    [0, 0, 0, 0, 0, 1, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 1],
    [0, 0, 0, 0, 0, 0, 1, 0]
  ]
};

/**
 * Alias for Toffoli gate
 */
const CCX = Toffoli;

/**
 * Gate registry: maps gate names to gate definitions
 */
const gates = {
  X,
  H,
  Z,
  Y,
  S,
  T,
  CNOT,
  CX,
  SWAP,
  Toffoli,
  CCX
};

/**
 * Get a gate definition by name
 * @param {string} name - Gate name (case-insensitive)
 * @returns {object|null} Gate definition or null if not found
 */
function getGate(name) {
  return gates[name.toUpperCase()] || null;
}

/**
 * Validate gate instruction
 * @param {object} instruction - Gate instruction with type and target(s)
 * @returns {object} Validation result {valid: boolean, error: string|null}
 */
function validateGateInstruction(instruction) {
  if (!instruction.type) {
    return { valid: false, error: 'Gate type is required' };
  }

  const gate = getGate(instruction.type);
  if (!gate) {
    return { valid: false, error: `Unknown gate type: ${instruction.type}` };
  }

  // Single-qubit gates require 'target'
  if (gate.qubits === 1) {
    if (instruction.target === undefined) {
      return { valid: false, error: 'Single-qubit gate requires target qubit' };
    }
    if (!Number.isInteger(instruction.target) || instruction.target < 0) {
      return { valid: false, error: 'Target qubit must be a non-negative integer' };
    }
  }

  // Two-qubit gates require 'control' and 'target'
  if (gate.qubits === 2) {
    if (instruction.control === undefined || instruction.target === undefined) {
      return { valid: false, error: 'Two-qubit gate requires control and target qubits' };
    }
    if (!Number.isInteger(instruction.control) || instruction.control < 0) {
      return { valid: false, error: 'Control qubit must be a non-negative integer' };
    }
    if (!Number.isInteger(instruction.target) || instruction.target < 0) {
      return { valid: false, error: 'Target qubit must be a non-negative integer' };
    }
    if (instruction.control === instruction.target) {
      return { valid: false, error: 'Control and target qubits must be different' };
    }
  }

  // Three-qubit gates require 'control1', 'control2', and 'target'
  if (gate.qubits === 3) {
    if (instruction.control1 === undefined || instruction.control2 === undefined || instruction.target === undefined) {
      return { valid: false, error: 'Three-qubit gate requires control1, control2, and target qubits' };
    }
    if (!Number.isInteger(instruction.control1) || instruction.control1 < 0) {
      return { valid: false, error: 'Control1 qubit must be a non-negative integer' };
    }
    if (!Number.isInteger(instruction.control2) || instruction.control2 < 0) {
      return { valid: false, error: 'Control2 qubit must be a non-negative integer' };
    }
    if (!Number.isInteger(instruction.target) || instruction.target < 0) {
      return { valid: false, error: 'Target qubit must be a non-negative integer' };
    }
    const qubits = new Set([instruction.control1, instruction.control2, instruction.target]);
    if (qubits.size !== 3) {
      return { valid: false, error: 'Control1, control2, and target qubits must all be different' };
    }
  }

  return { valid: true, error: null };
}

module.exports = {
  X,
  H,
  Z,
  Y,
  S,
  T,
  CNOT,
  CX,
  SWAP,
  Toffoli,
  CCX,
  gates,
  getGate,
  validateGateInstruction
};
