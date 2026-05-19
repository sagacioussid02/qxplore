const QuantumSimulator = require('../src/quantum/simulator');
const { getGateMatrix } = require('../src/quantum/gates');
const math = require('mathjs');

describe('QuantumSimulator', () => {
  describe('Single-qubit gates', () => {
    test('X gate flips |0⟩ to |1⟩', () => {
      const sim = new QuantumSimulator(1);
      sim.applySingleQubitGate('X', 0);
      const state = sim.getStateVector();
      expect(state[0]).toBeCloseTo(0, 5);
      expect(state[1]).toBeCloseTo(1, 5);
    });

    test('H gate creates superposition', () => {
      const sim = new QuantumSimulator(1);
      sim.applySingleQubitGate('H', 0);
      const state = sim.getStateVector();
      const expected = 1 / Math.sqrt(2);
      expect(state[0]).toBeCloseTo(expected, 5);
      expect(state[1]).toBeCloseTo(expected, 5);
    });

    test('Z gate leaves |0⟩ unchanged', () => {
      const sim = new QuantumSimulator(1);
      sim.applySingleQubitGate('Z', 0);
      const state = sim.getStateVector();
      expect(state[0]).toBeCloseTo(1, 5);
      expect(state[1]).toBeCloseTo(0, 5);
    });

    test('Z gate flips phase of |1⟩', () => {
      const sim = new QuantumSimulator(1);
      sim.applySingleQubitGate('X', 0); // |1⟩
      sim.applySingleQubitGate('Z', 0);
      const state = sim.getStateVector();
      expect(state[0]).toBeCloseTo(0, 5);
      expect(state[1]).toBeCloseTo(-1, 5);
    });

    test('Y gate behaves correctly', () => {
      const sim = new QuantumSimulator(1);
      sim.applySingleQubitGate('Y', 0);
      const state = sim.getStateVector();
      // Y|0⟩ = i|1⟩
      expect(state[0]).toBeCloseTo(0, 5);
      expect(typeof state[1]).toBe('object');
      expect(state[1].re).toBeCloseTo(0, 5);
      expect(state[1].im).toBeCloseTo(1, 5);
    });

    test('S gate applies phase', () => {
      const sim = new QuantumSimulator(1);
      sim.applySingleQubitGate('X', 0); // |1⟩
      sim.applySingleQubitGate('S', 0);
      const state = sim.getStateVector();
      // S|1⟩ = i|1⟩
      expect(state[0]).toBeCloseTo(0, 5);
      expect(typeof state[1]).toBe('object');
      expect(state[1].re).toBeCloseTo(0, 5);
      expect(state[1].im).toBeCloseTo(1, 5);
    });

    test('T gate applies phase', () => {
      const sim = new QuantumSimulator(1);
      sim.applySingleQubitGate('X', 0); // |1⟩
      sim.applySingleQubitGate('T', 0);
      const state = sim.getStateVector();
      // T|1⟩ = e^(iπ/4)|1⟩
      expect(state[0]).toBeCloseTo(0, 5);
      expect(typeof state[1]).toBe('object');
      const phase = Math.atan2(state[1].im, state[1].re);
      expect(phase).toBeCloseTo(Math.PI / 4, 5);
    });

    test('RX gate rotates around X-axis', () => {
      const sim = new QuantumSimulator(1);
      const angle = Math.PI / 2;
      sim.applySingleQubitGate('RX', 0, angle);
      const state = sim.getStateVector();
      // RX(π/2)|0⟩ = (|0⟩ - i|1⟩)/√2
      expect(state[0]).toBeCloseTo(Math.cos(angle / 2), 5);
      expect(typeof state[1]).toBe('object');
      expect(state[1].re).toBeCloseTo(0, 5);
      expect(state[1].im).toBeCloseTo(-Math.sin(angle / 2), 5);
    });

    test('RY gate rotates around Y-axis', () => {
      const sim = new QuantumSimulator(1);
      const angle = Math.PI / 2;
      sim.applySingleQubitGate('RY', 0, angle);
      const state = sim.getStateVector();
      // RY(π/2)|0⟩ = (|0⟩ + |1⟩)/√2
      expect(state[0]).toBeCloseTo(Math.cos(angle / 2), 5);
      expect(state[1]).toBeCloseTo(Math.sin(angle / 2), 5);
    });

    test('RZ gate rotates around Z-axis', () => {
      const sim = new QuantumSimulator(1);
      const angle = Math.PI / 2;
      sim.applySingleQubitGate('RZ', 0, angle);
      const state = sim.getStateVector();
      // RZ(π/2)|0⟩ = e^(-iπ/4)|0⟩
      expect(state[0]).toBeCloseTo(Math.cos(angle / 2), 5);
      expect(typeof state[0]).toBe('object');
    });
  });

  describe('Two-qubit gates', () => {
    test('CNOT with control=0, target=1', () => {
      const sim = new QuantumSimulator(2);
      // Create |1⟩ on qubit 0
      sim.applySingleQubitGate('X', 0);
      // Apply CNOT: should flip qubit 1
      sim.applyTwoQubitGate('CNOT', 0, 1);
      const state = sim.getStateVector();
      // Should be in |11⟩ state (index 3)
      expect(state[3]).toBeCloseTo(1, 5);
      expect(state[0]).toBeCloseTo(0, 5);
      expect(state[1]).toBeCloseTo(0, 5);
      expect(state[2]).toBeCloseTo(0, 5);
    });

    test('CNOT creates entanglement', () => {
      const sim = new QuantumSimulator(2);
      // Create superposition on qubit 0
      sim.applySingleQubitGate('H', 0);
      // Apply CNOT
      sim.applyTwoQubitGate('CNOT', 0, 1);
      const state = sim.getStateVector();
      // Should be in (|00⟩ + |11⟩)/√2
      const expected = 1 / Math.sqrt(2);
      expect(state[0]).toBeCloseTo(expected, 5);
      expect(state[3]).toBeCloseTo(expected, 5);
      expect(state[1]).toBeCloseTo(0, 5);
      expect(state[2]).toBeCloseTo(0, 5);
    });

    test('CNOT with control=1, target=0', () => {
      const sim = new QuantumSimulator(2);
      // Create |10⟩ state
      sim.applySingleQubitGate('X', 1);
      // Apply CNOT with control=1, target=0
      sim.applyTwoQubitGate('CNOT', 1, 0);
      const state = sim.getStateVector();
      // Should be in |11⟩ state (index 3)
      expect(state[3]).toBeCloseTo(1, 5);
    });
  });

  describe('Circuit execution', () => {
    test('Run circuit with multiple gates', () => {
      const sim = new QuantumSimulator(1);
      const circuit = [
        { type: 'H', target: 0 },
        { type: 'X', target: 0 }
      ];
      const state = sim.runCircuit(circuit);
      // H|0⟩ = (|0⟩ + |1⟩)/√2, then X flips to (|1⟩ + |0⟩)/√2
      const expected = 1 / Math.sqrt(2);
      expect(state[0]).toBeCloseTo(expected, 5);
      expect(state[1]).toBeCloseTo(expected, 5);
    });

    test('Run circuit with rotation gates', () => {
      const sim = new QuantumSimulator(1);
      const circuit = [
        { type: 'RY', target: 0, angle: Math.PI / 2 }
      ];
      const state = sim.runCircuit(circuit);
      const expected = 1 / Math.sqrt(2);
      expect(state[0]).toBeCloseTo(expected, 5);
      expect(state[1]).toBeCloseTo(expected, 5);
    });

    test('Run circuit with CNOT', () => {
      const sim = new QuantumSimulator(2);
      const circuit = [
        { type: 'H', target: 0 },
        { type: 'CNOT', control: 0, target: 1 }
      ];
      const state = sim.runCircuit(circuit);
      const expected = 1 / Math.sqrt(2);
      expect(state[0]).toBeCloseTo(expected, 5);
      expect(state[3]).toBeCloseTo(expected, 5);
    });
  });

  describe('Error handling', () => {
    test('Reject invalid qubit count', () => {
      expect(() => new QuantumSimulator(0)).toThrow();
      expect(() => new QuantumSimulator(3)).toThrow();
    });

    test('Reject unsupported gate', () => {
      const sim = new QuantumSimulator(1);
      expect(() => sim.applySingleQubitGate('UNKNOWN', 0)).toThrow();
    });

    test('Reject out-of-range target', () => {
      const sim = new QuantumSimulator(1);
      expect(() => sim.applySingleQubitGate('X', 5)).toThrow();
    });

    test('Reject rotation gate without angle', () => {
      const sim = new QuantumSimulator(1);
      expect(() => sim.applySingleQubitGate('RX', 0)).toThrow();
    });

    test('Reject CNOT without control', () => {
      const sim = new QuantumSimulator(2);
      expect(() => sim.applyTwoQubitGate('CNOT', undefined, 1)).toThrow();
    });
  });

  describe('Measurement', () => {
    test('Measurement of |0⟩ returns 0', () => {
      const sim = new QuantumSimulator(1);
      const result = sim.measure();
      expect(result[0]).toBe(0);
    });

    test('Measurement of |1⟩ returns 1', () => {
      const sim = new QuantumSimulator(1);
      sim.applySingleQubitGate('X', 0);
      const result = sim.measure();
      expect(result[0]).toBe(1);
    });

    test('Measurement of 2-qubit state returns array', () => {
      const sim = new QuantumSimulator(2);
      const result = sim.measure();
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBe(2);
      expect([0, 1]).toContain(result[0]);
      expect([0, 1]).toContain(result[1]);
    });
  });
});
