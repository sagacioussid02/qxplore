const { simulateCircuit } = require('../src/quantum/simulator');
const math = require('mathjs');

function almostEqual(a, b, tolerance = 1e-10) {
  return Math.abs(a - b) < tolerance;
}

describe('Quantum Simulator', () => {
  describe('Basic gates', () => {
    test('X gate on |0⟩ produces |1⟩', () => {
      const result = simulateCircuit(1, {
        gates: [{ type: 'X', target: 0 }]
      });
      expect(almostEqual(result.stateVector[0], 0)).toBe(true);
      expect(almostEqual(result.stateVector[1], 1)).toBe(true);
    });

    test('H gate on |0⟩ produces superposition', () => {
      const result = simulateCircuit(1, {
        gates: [{ type: 'H', target: 0 }]
      });
      const expected = 1 / Math.sqrt(2);
      expect(almostEqual(result.stateVector[0], expected)).toBe(true);
      expect(almostEqual(result.stateVector[1], expected)).toBe(true);
    });
  });

  describe('Z gate', () => {
    test('Z gate on |0⟩ produces |0⟩', () => {
      const result = simulateCircuit(1, {
        gates: [{ type: 'Z', target: 0 }]
      });
      expect(almostEqual(result.stateVector[0], 1)).toBe(true);
      expect(almostEqual(result.stateVector[1], 0)).toBe(true);
    });

    test('Z gate on |1⟩ produces −|1⟩', () => {
      const result = simulateCircuit(1, {
        gates: [
          { type: 'X', target: 0 },
          { type: 'Z', target: 0 }
        ]
      });
      expect(almostEqual(result.stateVector[0], 0)).toBe(true);
      expect(almostEqual(result.stateVector[1], 1)).toBe(true);
    });

    test('Z gate twice returns to original state', () => {
      const result = simulateCircuit(1, {
        gates: [
          { type: 'Z', target: 0 },
          { type: 'Z', target: 0 }
        ]
      });
      expect(almostEqual(result.stateVector[0], 1)).toBe(true);
      expect(almostEqual(result.stateVector[1], 0)).toBe(true);
    });
  });

  describe('Y gate', () => {
    test('Y gate on |0⟩ produces i|1⟩', () => {
      const result = simulateCircuit(1, {
        gates: [{ type: 'Y', target: 0 }]
      });
      expect(almostEqual(result.stateVector[0], 0)).toBe(true);
      expect(almostEqual(result.stateVector[1], 1)).toBe(true);
    });

    test('Y gate on |1⟩ produces −i|0⟩', () => {
      const result = simulateCircuit(1, {
        gates: [
          { type: 'X', target: 0 },
          { type: 'Y', target: 0 }
        ]
      });
      expect(almostEqual(result.stateVector[0], 1)).toBe(true);
      expect(almostEqual(result.stateVector[1], 0)).toBe(true);
    });

    test('Y gate twice returns to original state', () => {
      const result = simulateCircuit(1, {
        gates: [
          { type: 'Y', target: 0 },
          { type: 'Y', target: 0 }
        ]
      });
      expect(almostEqual(result.stateVector[0], 1)).toBe(true);
      expect(almostEqual(result.stateVector[1], 0)).toBe(true);
    });
  });

  describe('S gate', () => {
    test('S gate on |0⟩ produces |0⟩', () => {
      const result = simulateCircuit(1, {
        gates: [{ type: 'S', target: 0 }]
      });
      expect(almostEqual(result.stateVector[0], 1)).toBe(true);
      expect(almostEqual(result.stateVector[1], 0)).toBe(true);
    });

    test('S gate on |1⟩ produces i|1⟩', () => {
      const result = simulateCircuit(1, {
        gates: [
          { type: 'X', target: 0 },
          { type: 'S', target: 0 }
        ]
      });
      expect(almostEqual(result.stateVector[0], 0)).toBe(true);
      expect(almostEqual(result.stateVector[1], 1)).toBe(true);
    });

    test('S gate four times returns to original state', () => {
      const result = simulateCircuit(1, {
        gates: [
          { type: 'S', target: 0 },
          { type: 'S', target: 0 },
          { type: 'S', target: 0 },
          { type: 'S', target: 0 }
        ]
      });
      expect(almostEqual(result.stateVector[0], 1)).toBe(true);
      expect(almostEqual(result.stateVector[1], 0)).toBe(true);
    });
  });

  describe('T gate', () => {
    test('T gate on |0⟩ produces |0⟩', () => {
      const result = simulateCircuit(1, {
        gates: [{ type: 'T', target: 0 }]
      });
      expect(almostEqual(result.stateVector[0], 1)).toBe(true);
      expect(almostEqual(result.stateVector[1], 0)).toBe(true);
    });

    test('T gate on |1⟩ produces e^(iπ/4)|1⟩', () => {
      const result = simulateCircuit(1, {
        gates: [
          { type: 'X', target: 0 },
          { type: 'T', target: 0 }
        ]
      });
      expect(almostEqual(result.stateVector[0], 0)).toBe(true);
      expect(almostEqual(result.stateVector[1], 1)).toBe(true);
    });

    test('T gate eight times returns to original state', () => {
      const result = simulateCircuit(1, {
        gates: [
          { type: 'T', target: 0 },
          { type: 'T', target: 0 },
          { type: 'T', target: 0 },
          { type: 'T', target: 0 },
          { type: 'T', target: 0 },
          { type: 'T', target: 0 },
          { type: 'T', target: 0 },
          { type: 'T', target: 0 }
        ]
      });
      expect(almostEqual(result.stateVector[0], 1)).toBe(true);
      expect(almostEqual(result.stateVector[1], 0)).toBe(true);
    });
  });

  describe('Multi-qubit circuits', () => {
    test('Z gate on first qubit of two-qubit system', () => {
      const result = simulateCircuit(2, {
        gates: [
          { type: 'H', target: 0 },
          { type: 'H', target: 1 },
          { type: 'Z', target: 0 }
        ]
      });
      expect(result.stateVector.length).toBe(4);
    });

    test('Y gate on second qubit of two-qubit system', () => {
      const result = simulateCircuit(2, {
        gates: [
          { type: 'H', target: 0 },
          { type: 'H', target: 1 },
          { type: 'Y', target: 1 }
        ]
      });
      expect(result.stateVector.length).toBe(4);
    });
  });

  describe('Error handling', () => {
    test('throws error for unknown gate type', () => {
      expect(() => {
        simulateCircuit(1, {
          gates: [{ type: 'UNKNOWN', target: 0 }]
        });
      }).toThrow('Unknown gate type');
    });

    test('throws error for invalid qubit target', () => {
      expect(() => {
        simulateCircuit(1, {
          gates: [{ type: 'X', target: 5 }]
        });
      }).toThrow('out of range');
    });

    test('throws error for invalid number of qubits', () => {
      expect(() => {
        simulateCircuit(0, { gates: [] });
      }).toThrow('between 1 and 10');
    });
  });
});
