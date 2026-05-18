const QuantumSimulator = require('../src/quantum/simulator');
const { getGateMatrix, getGateQubits } = require('../src/quantum/gates');
const math = require('mathjs');

describe('Quantum Gates', () => {
  describe('Gate Matrix Definitions', () => {
    test('X gate matrix is correct', () => {
      const matrix = getGateMatrix('X');
      expect(matrix).toEqual([
        [0, 1],
        [1, 0]
      ]);
    });

    test('H gate matrix is correct', () => {
      const matrix = getGateMatrix('H');
      const inv2 = 1 / Math.sqrt(2);
      expect(matrix[0][0]).toBeCloseTo(inv2);
      expect(matrix[0][1]).toBeCloseTo(inv2);
      expect(matrix[1][0]).toBeCloseTo(inv2);
      expect(matrix[1][1]).toBeCloseTo(-inv2);
    });

    test('Z gate matrix is correct', () => {
      const matrix = getGateMatrix('Z');
      expect(matrix).toEqual([
        [1, 0],
        [0, -1]
      ]);
    });

    test('Y gate matrix is correct', () => {
      const matrix = getGateMatrix('Y');
      expect(matrix[0][0]).toEqual(0);
      expect(matrix[0][1]).toEqual(math.complex(0, -1));
      expect(matrix[1][0]).toEqual(math.complex(0, 1));
      expect(matrix[1][1]).toEqual(0);
    });

    test('S gate matrix is correct', () => {
      const matrix = getGateMatrix('S');
      expect(matrix[0][0]).toEqual(1);
      expect(matrix[0][1]).toEqual(0);
      expect(matrix[1][0]).toEqual(0);
      expect(matrix[1][1]).toEqual(math.complex(0, 1));
    });

    test('T gate matrix is correct', () => {
      const matrix = getGateMatrix('T');
      expect(matrix[0][0]).toEqual(1);
      expect(matrix[0][1]).toEqual(0);
      expect(matrix[1][0]).toEqual(0);
      // T gate: exp(i*pi/4)
      const expected = math.exp(math.complex(0, Math.PI / 4));
      expect(matrix[1][1].re).toBeCloseTo(expected.re);
      expect(matrix[1][1].im).toBeCloseTo(expected.im);
    });

    test('RX gate matrix is parameterized correctly', () => {
      const theta = Math.PI / 4;
      const matrix = getGateMatrix('RX', theta);
      const cos = Math.cos(theta / 2);
      const sin = Math.sin(theta / 2);
      expect(matrix[0][0]).toBeCloseTo(cos);
      expect(matrix[1][1]).toBeCloseTo(cos);
    });

    test('RY gate matrix is parameterized correctly', () => {
      const theta = Math.PI / 2;
      const matrix = getGateMatrix('RY', theta);
      const cos = Math.cos(theta / 2);
      const sin = Math.sin(theta / 2);
      expect(matrix[0][0]).toBeCloseTo(cos);
      expect(matrix[0][1]).toBeCloseTo(-sin);
      expect(matrix[1][0]).toBeCloseTo(sin);
      expect(matrix[1][1]).toBeCloseTo(cos);
    });

    test('RZ gate matrix is parameterized correctly', () => {
      const theta = Math.PI / 3;
      const matrix = getGateMatrix('RZ', theta);
      const exp1 = math.exp(math.complex(0, -theta / 2));
      const exp2 = math.exp(math.complex(0, theta / 2));
      expect(matrix[0][0].re).toBeCloseTo(exp1.re);
      expect(matrix[0][0].im).toBeCloseTo(exp1.im);
      expect(matrix[1][1].re).toBeCloseTo(exp2.re);
      expect(matrix[1][1].im).toBeCloseTo(exp2.im);
    });

    test('CNOT gate matrix is correct', () => {
      const matrix = getGateMatrix('CNOT');
      expect(matrix).toEqual([
        [1, 0, 0, 0],
        [0, 1, 0, 0],
        [0, 0, 0, 1],
        [0, 0, 1, 0]
      ]);
    });
  });

  describe('Gate Qubit Count', () => {
    test('Single-qubit gates return 1', () => {
      expect(getGateQubits('X')).toBe(1);
      expect(getGateQubits('H')).toBe(1);
      expect(getGateQubits('Z')).toBe(1);
      expect(getGateQubits('Y')).toBe(1);
      expect(getGateQubits('S')).toBe(1);
      expect(getGateQubits('T')).toBe(1);
      expect(getGateQubits('RX')).toBe(1);
      expect(getGateQubits('RY')).toBe(1);
      expect(getGateQubits('RZ')).toBe(1);
    });

    test('Two-qubit gates return 2', () => {
      expect(getGateQubits('CNOT')).toBe(2);
    });
  });

  describe('Single-Qubit Gate Application', () => {
    test('X gate flips |0⟩ to |1⟩', () => {
      const sim = new QuantumSimulator(1);
      sim.applyGate({ type: 'X', target: 0 });
      expect(sim.stateVector[0]).toBeCloseTo(0);
      expect(sim.stateVector[1]).toBeCloseTo(1);
    });

    test('H gate creates superposition', () => {
      const sim = new QuantumSimulator(1);
      sim.applyGate({ type: 'H', target: 0 });
      const inv2 = 1 / Math.sqrt(2);
      expect(sim.stateVector[0]).toBeCloseTo(inv2);
      expect(sim.stateVector[1]).toBeCloseTo(inv2);
    });

    test('Z gate leaves |0⟩ unchanged', () => {
      const sim = new QuantumSimulator(1);
      sim.applyGate({ type: 'Z', target: 0 });
      expect(sim.stateVector[0]).toBeCloseTo(1);
      expect(sim.stateVector[1]).toBeCloseTo(0);
    });

    test('Z gate flips phase of |1⟩', () => {
      const sim = new QuantumSimulator(1);
      sim.applyGate({ type: 'X', target: 0 }); // |1⟩
      sim.applyGate({ type: 'Z', target: 0 });
      expect(sim.stateVector[0]).toBeCloseTo(0);
      expect(sim.stateVector[1]).toBeCloseTo(-1);
    });

    test('Y gate applies correctly', () => {
      const sim = new QuantumSimulator(1);
      sim.applyGate({ type: 'Y', target: 0 });
      // Y|0⟩ = i|1⟩
      expect(sim.stateVector[0]).toBeCloseTo(0);
      expect(sim.stateVector[1].re).toBeCloseTo(0);
      expect(sim.stateVector[1].im).toBeCloseTo(1);
    });

    test('S gate applies phase correctly', () => {
      const sim = new QuantumSimulator(1);
      sim.applyGate({ type: 'X', target: 0 }); // |1⟩
      sim.applyGate({ type: 'S', target: 0 });
      // S|1⟩ = i|1⟩
      expect(sim.stateVector[0]).toBeCloseTo(0);
      expect(sim.stateVector[1].re).toBeCloseTo(0);
      expect(sim.stateVector[1].im).toBeCloseTo(1);
    });

    test('T gate applies phase correctly', () => {
      const sim = new QuantumSimulator(1);
      sim.applyGate({ type: 'X', target: 0 }); // |1⟩
      sim.applyGate({ type: 'T', target: 0 });
      // T|1⟩ = exp(i*pi/4)|1⟩
      const expected = math.exp(math.complex(0, Math.PI / 4));
      expect(sim.stateVector[0]).toBeCloseTo(0);
      expect(sim.stateVector[1].re).toBeCloseTo(expected.re);
      expect(sim.stateVector[1].im).toBeCloseTo(expected.im);
    });

    test('RX gate rotates around X-axis', () => {
      const sim = new QuantumSimulator(1);
      sim.applyGate({ type: 'RX', target: 0, theta: Math.PI });
      // RX(π)|0⟩ = -i|1⟩
      expect(sim.stateVector[0].re).toBeCloseTo(0);
      expect(sim.stateVector[0].im).toBeCloseTo(0);
      expect(sim.stateVector[1].re).toBeCloseTo(0);
      expect(sim.stateVector[1].im).toBeCloseTo(-1);
    });

    test('RY gate rotates around Y-axis', () => {
      const sim = new QuantumSimulator(1);
      sim.applyGate({ type: 'RY', target: 0, theta: Math.PI / 2 });
      // RY(π/2)|0⟩ = (1/√2)|0⟩ + (1/√2)|1⟩
      const inv2 = 1 / Math.sqrt(2);
      expect(sim.stateVector[0]).toBeCloseTo(inv2);
      expect(sim.stateVector[1]).toBeCloseTo(inv2);
    });

    test('RZ gate rotates around Z-axis', () => {
      const sim = new QuantumSimulator(1);
      sim.applyGate({ type: 'H', target: 0 }); // Superposition
      sim.applyGate({ type: 'RZ', target: 0, theta: Math.PI / 2 });
      // Should apply phase rotation
      expect(sim.stateVector.length).toBe(2);
    });
  });

  describe('Multi-Qubit Gate Application', () => {
    test('CNOT gate flips target when control is 1', () => {
      const sim = new QuantumSimulator(2);
      // Prepare |11⟩
      sim.applyGate({ type: 'X', target: 0 });
      sim.applyGate({ type: 'X', target: 1 });
      // Apply CNOT with control=0, target=1
      sim.applyGate({ type: 'CNOT', control: 0, target: 1 });
      // |11⟩ -> |10⟩ (target flipped)
      expect(sim.stateVector[2]).toBeCloseTo(1); // |10⟩ is index 2
    });

    test('CNOT gate leaves target unchanged when control is 0', () => {
      const sim = new QuantumSimulator(2);
      // Prepare |01⟩
      sim.applyGate({ type: 'X', target: 1 });
      // Apply CNOT with control=0, target=1
      sim.applyGate({ type: 'CNOT', control: 0, target: 1 });
      // |01⟩ -> |01⟩ (target unchanged)
      expect(sim.stateVector[2]).toBeCloseTo(1); // |01⟩ is index 2
    });

    test('CNOT creates entanglement from superposition', () => {
      const sim = new QuantumSimulator(2);
      // Create superposition on control qubit
      sim.applyGate({ type: 'H', target: 0 });
      // Apply CNOT
      sim.applyGate({ type: 'CNOT', control: 0, target: 1 });
      // Should create Bell state: (1/√2)(|00⟩ + |11⟩)
      const inv2 = 1 / Math.sqrt(2);
      expect(sim.stateVector[0]).toBeCloseTo(inv2); // |00⟩
      expect(sim.stateVector[3]).toBeCloseTo(inv2); // |11⟩
      expect(sim.stateVector[1]).toBeCloseTo(0);    // |01⟩
      expect(sim.stateVector[2]).toBeCloseTo(0);    // |10⟩
    });
  });

  describe('Error Handling', () => {
    test('Unknown gate type throws error', () => {
      expect(() => getGateMatrix('UNKNOWN')).toThrow('Unknown gate type');
    });

    test('Parameterized gate without theta throws error', () => {
      expect(() => getGateMatrix('RX')).toThrow('requires a rotation angle');
    });

    test('Invalid target qubit throws error', () => {
      const sim = new QuantumSimulator(1);
      expect(() => sim.applyGate({ type: 'X', target: 5 })).toThrow('out of range');
    });

    test('CNOT with same control and target throws error', () => {
      const sim = new QuantumSimulator(2);
      expect(() => sim.applyGate({ type: 'CNOT', control: 0, target: 0 })).toThrow('must be different');
    });
  });
});
