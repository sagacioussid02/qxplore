/**
 * Quantum circuit simulator.
 * Supports single-qubit and multi-qubit gates.
 */

const math = require('mathjs');
const { getGate } = require('./gates');

/**
 * Create initial state vector for n qubits (all in |0⟩ state)
 * @param {number} numQubits - Number of qubits
 * @returns {Array} State vector of length 2^numQubits
 */
function createInitialState(numQubits) {
  const size = Math.pow(2, numQubits);
  const state = new Array(size).fill(0);
  state[0] = 1; // |00...0⟩ state
  return state;
}

/**
 * Apply a single-qubit gate to the state vector
 * @param {Array} state - Current state vector
 * @param {object} gate - Gate definition with matrix
 * @param {number} target - Target qubit index
 * @param {number} numQubits - Total number of qubits
 * @returns {Array} Updated state vector
 */
function applySingleQubitGate(state, gate, target, numQubits) {
  const size = Math.pow(2, numQubits);
  const newState = new Array(size).fill(0);

  for (let i = 0; i < size; i++) {
    // Extract bit at target position
    const targetBit = (i >> target) & 1;
    // Create index with flipped target bit
    const j = i ^ (1 << target);

    // Apply gate matrix element
    const gateElement = gate.matrix[targetBit][0];
    const gateElement2 = gate.matrix[targetBit][1];

    newState[i] = math.add(
      math.multiply(gateElement, state[i]),
      math.multiply(gateElement2, state[j])
    );
  }

  return newState;
}

/**
 * Apply a two-qubit gate to the state vector
 * @param {Array} state - Current state vector
 * @param {object} gate - Gate definition with matrix
 * @param {number} control - Control qubit index
 * @param {number} target - Target qubit index
 * @param {number} numQubits - Total number of qubits
 * @returns {Array} Updated state vector
 */
function applyTwoQubitGate(state, gate, control, target, numQubits) {
  const size = Math.pow(2, numQubits);
  const newState = new Array(size).fill(0);

  // Ensure control < target for consistent indexing
  const c = Math.min(control, target);
  const t = Math.max(control, target);
  const swapped = control > target;

  for (let i = 0; i < size; i++) {
    const controlBit = (i >> c) & 1;
    const targetBit = (i >> t) & 1;

    // Map to 2-qubit basis index
    let basisIndex = (controlBit << 1) | targetBit;
    if (swapped) {
      basisIndex = (targetBit << 1) | controlBit;
    }

    // Apply gate matrix
    for (let j = 0; j < 4; j++) {
      const jControlBit = (j >> 1) & 1;
      const jTargetBit = j & 1;

      let jBasisIndex = (jControlBit << 1) | jTargetBit;
      if (swapped) {
        jBasisIndex = (jTargetBit << 1) | jControlBit;
      }

      // Create state index with modified control and target bits
      let stateIndex = i;
      stateIndex = (stateIndex & ~(1 << c)) | (jControlBit << c);
      stateIndex = (stateIndex & ~(1 << t)) | (jTargetBit << t);

      const gateElement = gate.matrix[basisIndex][jBasisIndex];
      newState[i] = math.add(newState[i], math.multiply(gateElement, state[stateIndex]));
    }
  }

  return newState;
}

/**
 * Apply a three-qubit gate to the state vector
 * @param {Array} state - Current state vector
 * @param {object} gate - Gate definition with matrix
 * @param {number} control1 - First control qubit index
 * @param {number} control2 - Second control qubit index
 * @param {number} target - Target qubit index
 * @param {number} numQubits - Total number of qubits
 * @returns {Array} Updated state vector
 */
function applyThreeQubitGate(state, gate, control1, control2, target, numQubits) {
  const size = Math.pow(2, numQubits);
  const newState = new Array(size).fill(0);

  // Sort qubit indices for consistent ordering
  const qubits = [control1, control2, target].map((q, i) => ({ idx: q, orig: i }));
  qubits.sort((a, b) => a.idx - b.idx);

  for (let i = 0; i < size; i++) {
    const bits = [0, 0, 0];
    for (let k = 0; k < 3; k++) {
      bits[qubits[k].orig] = (i >> qubits[k].idx) & 1;
    }

    const basisIndex = (bits[0] << 2) | (bits[1] << 1) | bits[2];

    // Apply gate matrix
    for (let j = 0; j < 8; j++) {
      const jBits = [(j >> 2) & 1, (j >> 1) & 1, j & 1];

      // Create state index with modified qubit bits
      let stateIndex = i;
      for (let k = 0; k < 3; k++) {
        stateIndex = (stateIndex & ~(1 << qubits[k].idx)) | (jBits[qubits[k].orig] << qubits[k].idx);
      }

      const gateElement = gate.matrix[basisIndex][j];
      newState[i] = math.add(newState[i], math.multiply(gateElement, state[stateIndex]));
    }
  }

  return newState;
}

/**
 * Run a quantum circuit and return the final state vector
 * @param {number} numQubits - Number of qubits
 * @param {object} circuit - Circuit definition with gates array
 * @returns {object} Result with stateVector and measurement
 */
function runCircuit(numQubits, circuit) {
  if (!numQubits || numQubits < 1) {
    throw new Error('numQubits must be at least 1');
  }

  if (!circuit || !Array.isArray(circuit.gates)) {
    throw new Error('circuit.gates must be an array');
  }

  let state = createInitialState(numQubits);

  // Apply each gate in sequence
  for (const instruction of circuit.gates) {
    const gate = getGate(instruction.type);
    if (!gate) {
      throw new Error(`Unknown gate: ${instruction.type}`);
    }

    if (gate.qubits === 1) {
      state = applySingleQubitGate(state, gate, instruction.target, numQubits);
    } else if (gate.qubits === 2) {
      state = applyTwoQubitGate(state, gate, instruction.control, instruction.target, numQubits);
    } else if (gate.qubits === 3) {
      state = applyThreeQubitGate(state, gate, instruction.control1, instruction.control2, instruction.target, numQubits);
    } else {
      throw new Error(`Unsupported gate size: ${gate.qubits}`);
    }
  }

  // Convert state vector to plain numbers (handle complex numbers)
  const stateVector = state.map(amplitude => {
    if (typeof amplitude === 'object' && amplitude.re !== undefined) {
      // Complex number
      return { re: amplitude.re, im: amplitude.im };
    }
    return amplitude;
  });

  // Generate measurement outcome (collapse to basis state)
  const probabilities = state.map(amp => {
    if (typeof amp === 'object' && amp.re !== undefined) {
      return amp.re * amp.re + amp.im * amp.im;
    }
    return amp * amp;
  });

  const rand = Math.random();
  let cumulative = 0;
  let measurementIndex = 0;
  for (let i = 0; i < probabilities.length; i++) {
    cumulative += probabilities[i];
    if (rand < cumulative) {
      measurementIndex = i;
      break;
    }
  }

  // Convert measurement index to binary representation
  const measurement = [];
  for (let i = 0; i < numQubits; i++) {
    measurement.push((measurementIndex >> i) & 1);
  }

  return {
    stateVector,
    measurement
  };
}

module.exports = {
  createInitialState,
  applySingleQubitGate,
  applyTwoQubitGate,
  applyThreeQubitGate,
  runCircuit
};
