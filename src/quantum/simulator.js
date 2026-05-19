const math = require('mathjs');
const { getGateMatrix, isGateSupported } = require('./gates');

/**
 * Quantum circuit simulator.
 * Supports single and two-qubit gates with state vector representation.
 */

class QuantumSimulator {
  constructor(numQubits) {
    if (numQubits < 1 || numQubits > 2) {
      throw new Error('Simulator currently supports 1-2 qubits');
    }
    this.numQubits = numQubits;
    this.stateSize = Math.pow(2, numQubits);
    // Initialize to |0...0⟩ state
    this.stateVector = new Array(this.stateSize).fill(0);
    this.stateVector[0] = 1;
  }

  /**
   * Apply a single-qubit gate to the state vector.
   *
   * @param {string} gateType - Gate name
   * @param {number} target - Target qubit index
   * @param {number} [angle] - Angle parameter for rotation gates
   */
  applySingleQubitGate(gateType, target, angle) {
    if (!isGateSupported(gateType)) {
      throw new Error(`Unsupported gate: ${gateType}`);
    }
    if (target < 0 || target >= this.numQubits) {
      throw new Error(`Target qubit ${target} out of range [0, ${this.numQubits - 1}]`);
    }

    const gateMatrix = getGateMatrix(gateType, angle);
    const newStateVector = new Array(this.stateSize).fill(0);

    // Apply gate to each basis state
    for (let i = 0; i < this.stateSize; i++) {
      const targetBit = (i >> target) & 1;
      for (let j = 0; j < 2; j++) {
        if (gateMatrix[j][targetBit] !== 0) {
          const newIndex = i ^ ((targetBit ^ j) << target);
          newStateVector[newIndex] = math.add(
            newStateVector[newIndex],
            math.multiply(this.stateVector[i], gateMatrix[j][targetBit])
          );
        }
      }
    }

    this.stateVector = newStateVector;
  }

  /**
   * Apply a two-qubit gate (CNOT).
   *
   * @param {string} gateType - Gate name (e.g., 'CNOT')
   * @param {number} control - Control qubit index
   * @param {number} target - Target qubit index
   */
  applyTwoQubitGate(gateType, control, target) {
    if (this.numQubits < 2) {
      throw new Error('Two-qubit gates require at least 2 qubits');
    }
    if (gateType !== 'CNOT') {
      throw new Error(`Unsupported two-qubit gate: ${gateType}`);
    }
    if (control === target) {
      throw new Error('Control and target qubits must be different');
    }
    if (control < 0 || control >= this.numQubits || target < 0 || target >= this.numQubits) {
      throw new Error(`Qubit indices out of range [0, ${this.numQubits - 1}]`);
    }

    const newStateVector = new Array(this.stateSize).fill(0);

    // CNOT: flip target if control is 1
    for (let i = 0; i < this.stateSize; i++) {
      const controlBit = (i >> control) & 1;
      if (controlBit === 1) {
        const newIndex = i ^ (1 << target);
        newStateVector[newIndex] = this.stateVector[i];
      } else {
        newStateVector[i] = this.stateVector[i];
      }
    }

    this.stateVector = newStateVector;
  }

  /**
   * Apply a gate from a circuit specification.
   *
   * @param {Object} gate - Gate specification {type, target, control, angle}
   */
  applyGate(gate) {
    const { type, target, control, angle } = gate;

    if (type === 'CNOT') {
      if (control === undefined) {
        throw new Error('CNOT gate requires control qubit');
      }
      this.applyTwoQubitGate(type, control, target);
    } else {
      this.applySingleQubitGate(type, target, angle);
    }
  }

  /**
   * Run a circuit and return the final state vector.
   *
   * @param {Array} gates - Array of gate specifications
   * @returns {Array} Final state vector
   */
  runCircuit(gates) {
    for (const gate of gates) {
      this.applyGate(gate);
    }
    return this.stateVector;
  }

  /**
   * Get the current state vector.
   *
   * @returns {Array} State vector
   */
  getStateVector() {
    return this.stateVector.map(amp => {
      if (typeof amp === 'number') {
        return amp;
      }
      // Convert complex numbers to {re, im} format for JSON serialization
      return { re: amp.re, im: amp.im };
    });
  }

  /**
   * Measure all qubits (collapse to a classical state).
   *
   * @returns {Array} Measurement result (array of 0s and 1s)
   */
  measure() {
    const probabilities = this.stateVector.map(amp => {
      const magnitude = typeof amp === 'number' ? Math.abs(amp) : math.abs(amp);
      return magnitude * magnitude;
    });

    const rand = Math.random();
    let cumulative = 0;
    for (let i = 0; i < probabilities.length; i++) {
      cumulative += probabilities[i];
      if (rand < cumulative) {
        // Convert index to binary representation
        const result = [];
        for (let j = 0; j < this.numQubits; j++) {
          result.push((i >> j) & 1);
        }
        return result;
      }
    }
    // Fallback (should not reach here)
    return new Array(this.numQubits).fill(0);
  }
}

module.exports = QuantumSimulator;
