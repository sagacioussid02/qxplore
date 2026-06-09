const math = require('mathjs');
const gates = require('./gates');

/**
 * Simulate a quantum circuit and return measurement results
 * @param {Object} circuit - Circuit definition with qubits and gates
 * @param {number} shots - Number of measurement shots
 * @returns {Promise<Object>} Measurement results with counts and/or statevector
 */
async function run(circuit, shots = 1024) {
  if (!circuit) {
    throw new Error('Circuit definition is required');
  }

  const numQubits = circuit.numQubits || 2;
  const gateList = circuit.gates || [];

  // Initialize statevector to |0...0⟩
  let statevector = new Array(Math.pow(2, numQubits)).fill(0);
  statevector[0] = 1;

  // Apply each gate
  for (const gate of gateList) {
    if (!gate.type) {
      throw new Error(`Gate missing type field: ${JSON.stringify(gate)}`);
    }

    const gateMatrix = gates.getGateMatrix(gate.type, numQubits, gate.target, gate.control);
    if (!gateMatrix) {
      throw new Error(`Unknown gate type: ${gate.type}`);
    }

    statevector = math.multiply(gateMatrix, statevector);
  }

  // Compute measurement probabilities
  const probabilities = statevector.map(amp => {
    const magnitude = math.abs(amp);
    return magnitude * magnitude;
  });

  // Sample from probabilities
  const counts = {};
  for (let i = 0; i < shots; i++) {
    const outcome = sampleFromProbabilities(probabilities);
    const bitstring = outcome.toString(2).padStart(numQubits, '0');
    counts[bitstring] = (counts[bitstring] || 0) + 1;
  }

  return {
    counts: counts,
    statevector: statevector.map(c => ({
      real: math.re(c),
      imag: math.im(c)
    })),
    numQubits: numQubits
  };
}

/**
 * Sample an outcome from a probability distribution
 * @param {number[]} probabilities - Array of probabilities
 * @returns {number} Sampled outcome index
 */
function sampleFromProbabilities(probabilities) {
  const random = Math.random();
  let cumulative = 0;
  for (let i = 0; i < probabilities.length; i++) {
    cumulative += probabilities[i];
    if (random < cumulative) {
      return i;
    }
  }
  return probabilities.length - 1;
}

module.exports = {
  run
};
