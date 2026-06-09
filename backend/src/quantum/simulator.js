/**
 * Quantum Circuit Simulator
 *
 * This module provides a statevector-based quantum circuit simulator.
 * It is used by the Express routing layer (backend/src/api/routes.js) to execute
 * quantum circuits when the Python engine is unavailable or as a fallback.
 *
 * Supported gates: X, H, Z, Y, S, T, CNOT, SWAP, Toffoli
 * Measurement: Collapse statevector and sample outcomes.
 */

const math = require('mathjs');

/**
 * Initialize a statevector for n qubits (all in |0⟩ state).
 * @param {number} numQubits
 * @returns {Array} Complex vector of length 2^numQubits
 */
function initializeStatevector(numQubits) {
  const size = Math.pow(2, numQubits);
  const sv = new Array(size).fill(0);
  sv[0] = 1; // |00...0⟩
  return sv;
}

/**
 * Apply a single-qubit gate to the statevector.
 * @param {Array} statevector
 * @param {string} gate - Gate name (X, H, Z, Y, S, T)
 * @param {number} target - Target qubit index
 * @param {number} numQubits - Total number of qubits
 * @returns {Array} Updated statevector
 */
function applySingleQubitGate(statevector, gate, target, numQubits) {
  const size = statevector.length;
  const newSv = new Array(size).fill(0);

  // Define gate matrices
  const gates = {
    X: [[0, 1], [1, 0]],
    H: [[1 / Math.sqrt(2), 1 / Math.sqrt(2)], [1 / Math.sqrt(2), -1 / Math.sqrt(2)]],
    Z: [[1, 0], [0, -1]],
    Y: [[0, math.complex(0, -1)], [math.complex(0, 1), 0]],
    S: [[1, 0], [0, math.complex(0, 1)]],
    T: [[1, 0], [0, math.exp(math.complex(0, Math.PI / 4))]]
  };

  const matrix = gates[gate];
  if (!matrix) throw new Error(`Unknown gate: ${gate}`);

  // Apply gate: iterate over all basis states
  for (let i = 0; i < size; i++) {
    const bit = (i >> target) & 1;
    const j = i ^ (1 << target); // Flip target bit

    const m00 = matrix[0][0];
    const m01 = matrix[0][1];
    const m10 = matrix[1][0];
    const m11 = matrix[1][1];

    if (bit === 0) {
      newSv[i] = math.add(newSv[i], math.multiply(m00, statevector[i]));
      newSv[i] = math.add(newSv[i], math.multiply(m01, statevector[j]));
    } else {
      newSv[i] = math.add(newSv[i], math.multiply(m10, statevector[i ^ (1 << target)]));
      newSv[i] = math.add(newSv[i], math.multiply(m11, statevector[j]));
    }
  }

  return newSv;
}

/**
 * Apply a two-qubit gate (CNOT, SWAP) to the statevector.
 * @param {Array} statevector
 * @param {string} gate - Gate name (CNOT, SWAP)
 * @param {number} control - Control qubit (for CNOT)
 * @param {number} target - Target qubit
 * @param {number} numQubits - Total number of qubits
 * @returns {Array} Updated statevector
 */
function applyTwoQubitGate(statevector, gate, control, target, numQubits) {
  const size = statevector.length;
  const newSv = statevector.slice();

  if (gate === 'CNOT' || gate === 'CX') {
    // CNOT: flip target if control is 1
    for (let i = 0; i < size; i++) {
      const controlBit = (i >> control) & 1;
      if (controlBit === 1) {
        const j = i ^ (1 << target);
        [newSv[i], newSv[j]] = [newSv[j], newSv[i]];
      }
    }
  } else if (gate === 'SWAP') {
    // SWAP: exchange target and control qubits
    for (let i = 0; i < size; i++) {
      const controlBit = (i >> control) & 1;
      const targetBit = (i >> target) & 1;
      if (controlBit !== targetBit) {
        const j = (i ^ (1 << control)) ^ (1 << target);
        [newSv[i], newSv[j]] = [newSv[j], newSv[i]];
      }
    }
  } else {
    throw new Error(`Unknown two-qubit gate: ${gate}`);
  }

  return newSv;
}

/**
 * Compute measurement probabilities from statevector.
 * @param {Array} statevector
 * @returns {Object} Probabilities for each basis state
 */
function computeProbabilities(statevector) {
  const probs = {};
  for (let i = 0; i < statevector.length; i++) {
    const amplitude = statevector[i];
    const prob = math.pow(math.abs(amplitude), 2);
    if (prob > 1e-10) {
      probs[i.toString(2).padStart(Math.log2(statevector.length), '0')] = parseFloat(prob.toFixed(6));
    }
  }
  return probs;
}

/**
 * Sample measurement outcomes from probabilities.
 * @param {Object} probabilities
 * @param {number} shots
 * @returns {Object} Counts for each outcome
 */
function sampleFromProbabilities(probabilities, shots) {
  const counts = {};
  for (let i = 0; i < shots; i++) {
    const rand = Math.random();
    let cumulative = 0;
    let outcome = Object.keys(probabilities)[Object.keys(probabilities).length - 1];
    for (const [state, prob] of Object.entries(probabilities)) {
      cumulative += prob;
      if (rand < cumulative) {
        outcome = state;
        break;
      }
    }
    counts[outcome] = (counts[outcome] || 0) + 1;
  }
  return counts;
}

/**
 * Execute a quantum circuit.
 * @param {Array} circuit - Array of gate operations
 * @param {number} numQubits - Number of qubits
 * @param {number} shots - Number of measurement shots
 * @returns {Object} { counts, statevector, executionTime }
 */
function executeCircuit(circuit, numQubits, shots = 1000) {
  const startTime = Date.now();

  let statevector = initializeStatevector(numQubits);

  for (const op of circuit) {
    const { gate, target, control } = op;

    if (gate === 'measure') {
      // Measurement is handled separately; skip here
      continue;
    }

    if (control !== undefined) {
      // Two-qubit gate
      statevector = applyTwoQubitGate(statevector, gate, control, target, numQubits);
    } else {
      // Single-qubit gate
      statevector = applySingleQubitGate(statevector, gate, target, numQubits);
    }
  }

  // Compute measurement probabilities
  const probabilities = computeProbabilities(statevector);
  const counts = sampleFromProbabilities(probabilities, shots);

  const executionTime = (Date.now() - startTime) / 1000;

  return {
    counts,
    statevector: statevector.map(c => {
      if (typeof c === 'object' && c.re !== undefined) {
        return { re: parseFloat(c.re.toFixed(6)), im: parseFloat(c.im.toFixed(6)) };
      }
      return parseFloat(c.toFixed(6));
    }),
    executionTime
  };
}

module.exports = {
  initializeStatevector,
  applySingleQubitGate,
  applyTwoQubitGate,
  computeProbabilities,
  sampleFromProbabilities,
  executeCircuit
};
