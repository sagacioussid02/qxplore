const math = require('mathjs');
const gates = require('./gates');

/**
 * Quantum circuit simulator
 * Simulates quantum circuits using state vector representation
 */

function createInitialState(numQubits) {
  const size = Math.pow(2, numQubits);
  const state = new Array(size).fill(math.complex(0, 0));
  state[0] = math.complex(1, 0); // |0...0⟩
  return state;
}

function applyGate(state, gateType, target, numQubits) {
  if (!gates[gateType]) {
    throw new Error(`Unknown gate type: ${gateType}`);
  }

  const gateMatrix = gates[gateType].matrix;
  const size = Math.pow(2, numQubits);
  const newState = new Array(size).fill(math.complex(0, 0));

  for (let i = 0; i < size; i++) {
    // Extract the bit at position 'target'
    const targetBit = (i >> target) & 1;
    const otherBits = i & ~(1 << target);

    // Apply gate to both basis states
    for (let j = 0; j < 2; j++) {
      const newTargetBit = j;
      const newIndex = otherBits | (newTargetBit << target);
      const amplitude = math.multiply(gateMatrix[j][targetBit], state[i]);
      newState[newIndex] = math.add(newState[newIndex], amplitude);
    }
  }

  return newState;
}

function simulateCircuit(numQubits, circuit) {
  if (numQubits < 1 || numQubits > 10) {
    throw new Error('Number of qubits must be between 1 and 10');
  }

  let state = createInitialState(numQubits);

  // Apply each gate in sequence
  if (circuit.gates && Array.isArray(circuit.gates)) {
    for (const gate of circuit.gates) {
      if (!gate.type || gate.target === undefined) {
        throw new Error('Each gate must have a type and target');
      }

      if (gate.target < 0 || gate.target >= numQubits) {
        throw new Error(`Gate target ${gate.target} out of range for ${numQubits} qubits`);
      }

      state = applyGate(state, gate.type, gate.target, numQubits);
    }
  }

  // Convert complex amplitudes to real numbers for JSON serialization
  const stateVector = state.map(amp => {
    if (typeof amp === 'object' && amp.re !== undefined) {
      // Return magnitude for display
      return math.abs(amp);
    }
    return Math.abs(amp);
  });

  // Simulate measurement (collapse to a basis state)
  const probabilities = stateVector.map(amp => amp * amp);
  let measurement = 0;
  let random = Math.random();
  let cumulative = 0;
  for (let i = 0; i < probabilities.length; i++) {
    cumulative += probabilities[i];
    if (random <= cumulative) {
      measurement = i;
      break;
    }
  }

  // Convert measurement index to binary array
  const measurementBits = [];
  for (let i = 0; i < numQubits; i++) {
    measurementBits.push((measurement >> i) & 1);
  }

  return {
    stateVector,
    measurement: measurementBits
  };
}

module.exports = {
  simulateCircuit,
  createInitialState,
  applyGate
};
