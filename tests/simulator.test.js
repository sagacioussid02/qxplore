const { createSimulator, applyGate } = require('../src/quantum/simulator');
const { X, H, Z, Y, S, T } = require('../src/quantum/gates');
const math = require('mathjs');

describe('Quantum Simulator', () => {
  describe('State Vector Initialization', () => {
    test('should initialize |0⟩ state for single qubit', () => {
      const sim = createSimulator(1);
      const state = sim.getStateVector();
      expect(state.length).toBe(2);
      expect(math.abs(state[0])).toBeCloseTo(1, 5);
      expect(math.abs(state[1])).toBeCloseTo(0, 5);
    });

    test('should initialize |00⟩ state for two qubits', () => {
      const sim = createSimulator(2);
      const state = sim.getStateVector();
      expect(state.length).toBe(4);
      expect(math.abs(state[0])).toBeCloseTo(1, 5);
      state.slice(1).forEach(amp => {
        expect(math.abs(amp)).toBeCloseTo(0, 5);
      });
    });
  });

  describe('X Gate (Pauli X / NOT)', () => {
    test('should flip |0⟩ to |1⟩', () => {
      const sim = createSimulator(1);
      applyGate(sim, X, 0);
      const state = sim.getStateVector();
      expect(math.abs(state[0])).toBeCloseTo(0, 5);
      expect(math.abs(state[1])).toBeCloseTo(1, 5);
    });

    test('should flip |1⟩ back to |0⟩', () => {
      const sim = createSimulator(1);
      applyGate(sim, X, 0);
      applyGate(sim, X, 0);
      const state = sim.getStateVector();
      expect(math.abs(state[0])).toBeCloseTo(1, 5);
      expect(math.abs(state[1])).toBeCloseTo(0, 5);
    });
  });

  describe('H Gate (Hadamard)', () => {
    test('should create superposition |+⟩ from |0⟩', () => {
      const sim = createSimulator(1);
      applyGate(sim, H, 0);
      const state = sim.getStateVector();
      const expected = 1 / Math.sqrt(2);
      expect(math.abs(state[0])).toBeCloseTo(expected, 5);
      expect(math.abs(state[1])).toBeCloseTo(expected, 5);
    });

    test('should be self-inverse: H² = I', () => {
      const sim = createSimulator(1);
      applyGate(sim, H, 0);
      applyGate(sim, H, 0);
      const state = sim.getStateVector();
      expect(math.abs(state[0])).toBeCloseTo(1, 5);
      expect(math.abs(state[1])).toBeCloseTo(0, 5);
    });
  });

  describe('Z Gate (Pauli Z)', () => {
    test('should leave |0⟩ unchanged: Z|0⟩ = |0⟩', () => {
      const sim = createSimulator(1);
      applyGate(sim, Z, 0);
      const state = sim.getStateVector();
      expect(math.abs(state[0])).toBeCloseTo(1, 5);
      expect(math.abs(state[1])).toBeCloseTo(0, 5);
    });

    test('should flip phase of |1⟩: Z|1⟩ = −|1⟩', () => {
      const sim = createSimulator(1);
      applyGate(sim, X, 0); // Prepare |1⟩
      applyGate(sim, Z, 0);
      const state = sim.getStateVector();
      expect(math.abs(state[0])).toBeCloseTo(0, 5);
      expect(math.abs(state[1])).toBeCloseTo(1, 5);
    });

    test('should flip phase in superposition', () => {
      const sim = createSimulator(1);
      applyGate(sim, H, 0); // Create |+⟩
      applyGate(sim, Z, 0);
      const state = sim.getStateVector();
      const expected = 1 / Math.sqrt(2);
      expect(math.abs(state[0])).toBeCloseTo(expected, 5);
      expect(math.abs(state[1])).toBeCloseTo(expected, 5);
    });
  });

  describe('Y Gate (Pauli Y)', () => {
    test('should flip and apply phase: Y|0⟩ = i|1⟩', () => {
      const sim = createSimulator(1);
      applyGate(sim, Y, 0);
      const state = sim.getStateVector();
      expect(math.abs(state[0])).toBeCloseTo(0, 5);
      expect(math.abs(state[1])).toBeCloseTo(1, 5);
    });

    test('should satisfy Y² = I', () => {
      const sim = createSimulator(1);
      applyGate(sim, Y, 0);
      applyGate(sim, Y, 0);
      const state = sim.getStateVector();
      expect(math.abs(state[0])).toBeCloseTo(1, 5);
      expect(math.abs(state[1])).toBeCloseTo(0, 5);
    });
  });

  describe('S Gate (Phase Gate)', () => {
    test('should apply π/2 phase to |1⟩', () => {
      const sim = createSimulator(1);
      applyGate(sim, X, 0); // Prepare |1⟩
      applyGate(sim, S, 0);
      const state = sim.getStateVector();
      expect(math.abs(state[0])).toBeCloseTo(0, 5);
      expect(math.abs(state[1])).toBeCloseTo(1, 5);
    });

    test('should satisfy S⁴ = I', () => {
      const sim = createSimulator(1);
      applyGate(sim, X, 0);
      applyGate(sim, S, 0);
      applyGate(sim, S, 0);
      applyGate(sim, S, 0);
      applyGate(sim, S, 0);
      const state = sim.getStateVector();
      expect(math.abs(state[0])).toBeCloseTo(0, 5);
      expect(math.abs(state[1])).toBeCloseTo(1, 5);
    });
  });

  describe('T Gate', () => {
    test('should apply π/4 phase to |1⟩', () => {
      const sim = createSimulator(1);
      applyGate(sim, X, 0); // Prepare |1⟩
      applyGate(sim, T, 0);
      const state = sim.getStateVector();
      expect(math.abs(state[0])).toBeCloseTo(0, 5);
      expect(math.abs(state[1])).toBeCloseTo(1, 5);
    });

    test('should satisfy T⁸ = I', () => {
      const sim = createSimulator(1);
      applyGate(sim, X, 0);
      for (let i = 0; i < 8; i++) {
        applyGate(sim, T, 0);
      }
      const state = sim.getStateVector();
      expect(math.abs(state[0])).toBeCloseTo(0, 5);
      expect(math.abs(state[1])).toBeCloseTo(1, 5);
    });
  });

  describe('Gate Composition', () => {
    test('should compose X and Z gates correctly', () => {
      const sim = createSimulator(1);
      applyGate(sim, X, 0);
      applyGate(sim, Z, 0);
      const state = sim.getStateVector();
      expect(math.abs(state[0])).toBeCloseTo(0, 5);
      expect(math.abs(state[1])).toBeCloseTo(1, 5);
    });

    test('should compose H, Z, H to create X', () => {
      const sim1 = createSimulator(1);
      applyGate(sim1, X, 0);
      const state1 = sim1.getStateVector();

      const sim2 = createSimulator(1);
      applyGate(sim2, H, 0);
      applyGate(sim2, Z, 0);
      applyGate(sim2, H, 0);
      const state2 = sim2.getStateVector();

      expect(math.abs(state1[0])).toBeCloseTo(math.abs(state2[0]), 5);
      expect(math.abs(state1[1])).toBeCloseTo(math.abs(state2[1]), 5);
    });
  });
});
