/**
 * Tests for multi-qubit gates (CNOT, SWAP, Toffoli)
 */

const { runCircuit } = require('../src/quantum/simulator');
const { getGate, validateGateInstruction } = require('../src/quantum/gates');

describe('Multi-qubit Gates', () => {
  describe('CNOT Gate', () => {
    test('CNOT gate definition exists', () => {
      const cnot = getGate('CNOT');
      expect(cnot).toBeDefined();
      expect(cnot.qubits).toBe(2);
      expect(cnot.matrix).toHaveLength(4);
    });

    test('CNOT gate unitary matrix is correct', () => {
      const cnot = getGate('CNOT');
      const expected = [
        [1, 0, 0, 0],
        [0, 1, 0, 0],
        [0, 0, 0, 1],
        [0, 0, 1, 0]
      ];
      expect(cnot.matrix).toEqual(expected);
    });

    test('CNOT flips target when control is |1⟩', () => {
      // Prepare |10⟩ state: X on qubit 1, then CNOT
      const result = runCircuit(2, {
        gates: [
          { type: 'X', target: 1 },
          { type: 'CNOT', control: 1, target: 0 }
        ]
      });

      // Should result in |11⟩ state
      expect(result.stateVector[3]).toBeCloseTo(1, 5); // |11⟩ amplitude
      expect(Math.abs(result.stateVector[0])).toBeLessThan(1e-10); // |00⟩ amplitude
    });

    test('CNOT leaves target unchanged when control is |0⟩', () => {
      // Prepare |01⟩ state: X on qubit 0, then CNOT
      const result = runCircuit(2, {
        gates: [
          { type: 'X', target: 0 },
          { type: 'CNOT', control: 1, target: 0 }
        ]
      });

      // Should remain in |01⟩ state
      expect(result.stateVector[1]).toBeCloseTo(1, 5); // |01⟩ amplitude
    });

    test('CX is alias for CNOT', () => {
      const cnot = getGate('CNOT');
      const cx = getGate('CX');
      expect(cx).toEqual(cnot);
    });
  });

  describe('SWAP Gate', () => {
    test('SWAP gate definition exists', () => {
      const swap = getGate('SWAP');
      expect(swap).toBeDefined();
      expect(swap.qubits).toBe(2);
      expect(swap.matrix).toHaveLength(4);
    });

    test('SWAP gate unitary matrix is correct', () => {
      const swap = getGate('SWAP');
      const expected = [
        [1, 0, 0, 0],
        [0, 0, 1, 0],
        [0, 1, 0, 0],
        [0, 0, 0, 1]
      ];
      expect(swap.matrix).toEqual(expected);
    });

    test('SWAP exchanges qubit states', () => {
      // Prepare |10⟩ state: X on qubit 1
      const result = runCircuit(2, {
        gates: [
          { type: 'X', target: 1 },
          { type: 'SWAP', control: 0, target: 1 }
        ]
      });

      // After SWAP, should be in |01⟩ state
      expect(result.stateVector[1]).toBeCloseTo(1, 5); // |01⟩ amplitude
      expect(Math.abs(result.stateVector[2])).toBeLessThan(1e-10); // |10⟩ amplitude
    });

    test('SWAP is self-inverse', () => {
      // Apply SWAP twice should return to original state
      const result = runCircuit(2, {
        gates: [
          { type: 'X', target: 0 },
          { type: 'SWAP', control: 0, target: 1 },
          { type: 'SWAP', control: 0, target: 1 }
        ]
      });

      // Should be back in |10⟩ state
      expect(result.stateVector[2]).toBeCloseTo(1, 5); // |10⟩ amplitude
    });
  });

  describe('Toffoli Gate', () => {
    test('Toffoli gate definition exists', () => {
      const toffoli = getGate('Toffoli');
      expect(toffoli).toBeDefined();
      expect(toffoli.qubits).toBe(3);
      expect(toffoli.matrix).toHaveLength(8);
    });

    test('Toffoli gate unitary matrix is correct', () => {
      const toffoli = getGate('Toffoli');
      const expected = [
        [1, 0, 0, 0, 0, 0, 0, 0],
        [0, 1, 0, 0, 0, 0, 0, 0],
        [0, 0, 1, 0, 0, 0, 0, 0],
        [0, 0, 0, 1, 0, 0, 0, 0],
        [0, 0, 0, 0, 1, 0, 0, 0],
        [0, 0, 0, 0, 0, 1, 0, 0],
        [0, 0, 0, 0, 0, 0, 0, 1],
        [0, 0, 0, 0, 0, 0, 1, 0]
      ];
      expect(toffoli.matrix).toEqual(expected);
    });

    test('Toffoli flips target when both controls are |1⟩', () => {
      // Prepare |110⟩ state: X on qubits 1 and 2
      const result = runCircuit(3, {
        gates: [
          { type: 'X', target: 1 },
          { type: 'X', target: 2 },
          { type: 'Toffoli', control1: 1, control2: 2, target: 0 }
        ]
      });

      // Should result in |111⟩ state
      expect(result.stateVector[7]).toBeCloseTo(1, 5); // |111⟩ amplitude
    });

    test('Toffoli leaves target unchanged when one control is |0⟩', () => {
      // Prepare |100⟩ state: X on qubit 2 only
      const result = runCircuit(3, {
        gates: [
          { type: 'X', target: 2 },
          { type: 'Toffoli', control1: 1, control2: 2, target: 0 }
        ]
      });

      // Should remain in |100⟩ state
      expect(result.stateVector[4]).toBeCloseTo(1, 5); // |100⟩ amplitude
    });

    test('CCX is alias for Toffoli', () => {
      const toffoli = getGate('Toffoli');
      const ccx = getGate('CCX');
      expect(ccx).toEqual(toffoli);
    });
  });

  describe('Gate Instruction Validation', () => {
    test('validates single-qubit gate requires target', () => {
      const validation = validateGateInstruction({ type: 'X' });
      expect(validation.valid).toBe(false);
      expect(validation.error).toContain('target');
    });

    test('validates two-qubit gate requires control and target', () => {
      const validation = validateGateInstruction({ type: 'CNOT', control: 0 });
      expect(validation.valid).toBe(false);
      expect(validation.error).toContain('target');
    });

    test('validates two-qubit gate control and target are different', () => {
      const validation = validateGateInstruction({ type: 'CNOT', control: 0, target: 0 });
      expect(validation.valid).toBe(false);
      expect(validation.error).toContain('different');
    });

    test('validates three-qubit gate requires all three qubits', () => {
      const validation = validateGateInstruction({ type: 'Toffoli', control1: 0, control2: 1 });
      expect(validation.valid).toBe(false);
      expect(validation.error).toContain('target');
    });

    test('validates three-qubit gate qubits are all different', () => {
      const validation = validateGateInstruction({ type: 'Toffoli', control1: 0, control2: 0, target: 1 });
      expect(validation.valid).toBe(false);
      expect(validation.error).toContain('different');
    });

    test('accepts valid single-qubit gate instruction', () => {
      const validation = validateGateInstruction({ type: 'X', target: 0 });
      expect(validation.valid).toBe(true);
      expect(validation.error).toBeNull();
    });

    test('accepts valid two-qubit gate instruction', () => {
      const validation = validateGateInstruction({ type: 'CNOT', control: 0, target: 1 });
      expect(validation.valid).toBe(true);
      expect(validation.error).toBeNull();
    });

    test('accepts valid three-qubit gate instruction', () => {
      const validation = validateGateInstruction({ type: 'Toffoli', control1: 0, control2: 1, target: 2 });
      expect(validation.valid).toBe(true);
      expect(validation.error).toBeNull();
    });
  });

  describe('Multi-qubit Circuit Execution', () => {
    test('executes circuit with CNOT gate', () => {
      const result = runCircuit(2, {
        gates: [
          { type: 'H', target: 1 },
          { type: 'CNOT', control: 1, target: 0 }
        ]
      });

      expect(result.stateVector).toBeDefined();
      expect(result.stateVector).toHaveLength(4);
      expect(result.measurement).toBeDefined();
      expect(result.measurement).toHaveLength(2);
    });

    test('executes circuit with SWAP gate', () => {
      const result = runCircuit(2, {
        gates: [
          { type: 'X', target: 0 },
          { type: 'SWAP', control: 0, target: 1 }
        ]
      });

      expect(result.stateVector).toBeDefined();
      expect(result.stateVector).toHaveLength(4);
      expect(result.measurement).toBeDefined();
      expect(result.measurement).toHaveLength(2);
    });

    test('executes circuit with Toffoli gate', () => {
      const result = runCircuit(3, {
        gates: [
          { type: 'X', target: 1 },
          { type: 'X', target: 2 },
          { type: 'Toffoli', control1: 1, control2: 2, target: 0 }
        ]
      });

      expect(result.stateVector).toBeDefined();
      expect(result.stateVector).toHaveLength(8);
      expect(result.measurement).toBeDefined();
      expect(result.measurement).toHaveLength(3);
    });

    test('executes mixed single and multi-qubit circuit', () => {
      const result = runCircuit(3, {
        gates: [
          { type: 'H', target: 0 },
          { type: 'X', target: 1 },
          { type: 'CNOT', control: 0, target: 1 },
          { type: 'SWAP', control: 1, target: 2 }
        ]
      });

      expect(result.stateVector).toBeDefined();
      expect(result.stateVector).toHaveLength(8);
      expect(result.measurement).toBeDefined();
      expect(result.measurement).toHaveLength(3);
    });
  });
});
