export interface BlochVector {
  theta: number;
  phi: number;
  x: number;
  y: number;
  z: number;
}

export interface ComplexAmplitude {
  real: number;
  imag: number;
}

export interface StatevectorResult {
  amplitudes: ComplexAmplitude[];
  n_qubits: number;
  probabilities: Record<string, number>;
  measured_bitstring: string;
  circuit_qasm: string;
}

export interface CoinQuantumResult {
  result: number; // 0 or 1
  statevector_before: StatevectorResult;
  statevector_after: StatevectorResult;
  bloch_before: BlochVector;
  bloch_after: BlochVector;
  circuit_qasm: string;
}

export interface RouletteQuantumResult {
  result: number;
  n_qubits: number;
  bitstring: string;
  circuit_qasm: string;
  outcome_label: string;
  color: 'green' | 'red' | 'black';
}

export interface CollapseAssignment {
  move_id: number;
  player: string;
  original_cells: [number, number];
  assigned_cell: number;
}

export interface TTTCollapseResult {
  assignments: CollapseAssignment[];
  circuit_qasm: string;
  measurement_results: Record<string, number>;
}
