const math = require('mathjs');
const { getGateMatrix, getGateQubits } = require('./gates');

/**
 * Quantum circuit simulator.
 * Simulates quantum circuits by applying unitary transformations to state vectors.
 */

class QuantumSimulator {
  /**
   * Initialize a quantum simulator with a given number of qubits.
   *
   * @param {number} numQubits - Number of qubits in the circuit
   */
  constructor(numQubits) {
    if (numQubits < 1) {
      throw new Error('Number of qubits must be at least 1');
    }
    this.numQubits = numQubits;
    this.stateVector = this.initializeState();
  }

  /**
   * Initialize the state vector to |0...0⟩ (all qubits in ground state).
   *
   * @returns {Array} Initial state vector
   */
  initializeState() {
    const size = Math.pow(2, this.numQubits);
    const state = new Array(size).fill(0);
    state[0] = 1; // |0...0⟩
    return state;
  }

  /**
   * Apply a single-qubit gate to the state vector.
   *
   * @param {string} gateType - Gate type (e.g., 'X', 'H', 'RX')
   * @param {number} target - Target qubit index
   * @param {number} theta - Rotation angle (for parameterized gates)
   */
  applySingleQubitGate(gateType, target, theta) {
    if (target < 0 || target >= this.numQubits) {
      throw new Error(`Target qubit ${target} out of range [0, ${this.numQubits - 1}]`);
    }

    const gateMatrix = getGateMatrix(gateType, theta);
    const newState = new Array(this.stateVector.length).fill(0);

    // Apply gate to target qubit
    for (let i = 0; i < this.stateVector.length; i++) {
      const targetBit = (i >> target) & 1;
      const otherBits = (i & ~(1 << target)) | ((1 - targetBit) << target);

      for (let j = 0; j < 2; j++) {
        const matrixElement = gateMatrix[j][targetBit];
        newState[i] = math.add(newState[i], math.multiply(matrixElement, this.stateVector[otherBits]));
      }
    }

    this.stateVector = newState;
  }

  /**
   * Apply a two-qubit gate (CNOT) to the state vector.
   *
   * @param {string} gateType - Gate type (must be 'CNOT')
   * @param {number} control - Control qubit index
   * @param {number} target - Target qubit index
   */
  applyTwoQubitGate(gateType, control, target) {
    if (gateType !== 'CNOT') {
      throw new Error(`Two-qubit gate ${gateType} not yet implemented`);
    }

    if (control < 0 || control >= this.numQubits) {
      throw new Error(`Control qubit ${control} out of range [0, ${this.numQubits - 1}]`);
    }
    if (target < 0 || target >= this.numQubits) {
      throw new Error(`Target qubit ${target} out of range [0, ${this.numQubits - 1}]`);
    }
    if (control === target) {
      throw new Error('Control and target qubits must be different');
    }

    const newState = this.stateVector.slice();

    // CNOT: flip target qubit if control qubit is 1
    for (let i = 0; i < this.stateVector.length; i++) {
      const controlBit = (i >> control) & 1;
      if (controlBit === 1) {
        const targetBit = (i >> target) & 1;
        const flipped = i ^ (1 << target); // Flip target bit
        newState[i] = this.stateVector[flipped];
      }
    }

    this.stateVector = newState;
  }

  /**
   * Apply a gate to the circuit.
   *
   * @param {Object} gate - Gate object with type, target, and optional theta
   */
  applyGate(gate) {
    const { type, target, control, theta } = gate;

    if (!type) {
      throw new Error('Gate must have a type');
    }

    const numQubits = getGateQubits(type);

    if (numQubits === 1) {
      this.applySingleQubitGate(type, target, theta);
    } else if (numQubits === 2) {
      this.applyTwoQubitGate(type, control, target);
    } else {
      throw new Error(`Gates with ${numQubits} qubits are not yet supported`);
    }
  }

  /**
   * Run a quantum circuit.
   *
   * @param {Object} circuit - Circuit object with gates array
   * @returns {Object} Result with state vector and measurement
   */
  runCircuit(circuit) {
    if (!circuit || !Array.isArray(circuit.gates)) {
      throw new Error('Circuit must have a gates array');
    }

    // Reset state
    this.stateVector = this.initializeState();

    // Apply each gate
    for (const gate of circuit.gates) {
      this.applyGate(gate);
    }

    // Measure all qubits (collapse to most probable state)
    const measurement = this.measure();

    return {
      stateVector: this.stateVector.map(amp => {
        if (typeof amp === 'number') {
          return Math.round(amp * 10000) / 10000;
        }
        return {
          real: Math.round(amp.re * 10000) / 10000,
          imag: Math.round(amp.im * 10000) / 10000
        };
      }),
      measurement
    };
  }

  /**
   * Measure all qubits (collapse to most probable state).
   *
   * @returns {Array} Measurement result (array of 0s and 1s)
   */
  measure() {
    // Find the state with the highest probability
    let maxProb = 0;
    let maxIndex = 0;

    for (let i = 0; i < this.stateVector.length; i++) {
      const amp = this.stateVector[i];
      const prob = typeof amp === 'number' ? amp * amp : amp.re * amp.re + amp.im * amp.im;
      if (prob > maxProb) {
        maxProb = prob;
        maxIndex = i;
      }
    }

    // Convert index to binary representation
    const measurement = [];
    for (let i = 0; i < this.numQubits; i++) {
      measurement.push((maxIndex >> i) & 1);
    }

    return measurement;
  }
}

module.exports = QuantumSimulator;
