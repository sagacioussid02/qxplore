export type TemplateName = 'grover' | 'rng' | 'shor' | 'qft' | 'qaoa' | 'freeform';

export interface TemplateParameter {
  name: string;
  label: string;
  type: 'int' | 'gates';
  min?: number;
  max?: number;
  default?: number;
  note?: string;
}

export interface TemplateInfo {
  name: TemplateName;
  title: string;
  tagline: string;
  quantum_algo: string;
  classical_algo: string;
  complexity_quantum: string;
  complexity_classical: string;
  parameters: TemplateParameter[];
}

export interface QuantumMetrics {
  circuit_depth: number;
  gate_count: number | Record<string, number>;
  cnot_count: number;
  qubit_count: number;
  sim_time_ms: number;
  shots: number;
  measurement_distribution: Record<string, number>;
  extra: Record<string, unknown>;
}

export interface ClassicalMetrics {
  algorithm: string;
  steps: number;
  time_ms: number;
  result: Record<string, unknown>;
  complexity_label: string;
}

export interface BenchmarkResult {
  id: string | null;
  template: TemplateName;
  parameters: Record<string, unknown>;
  quantum: QuantumMetrics;
  classical: ClassicalMetrics | null;
  speedup_factor: number | null;
  created_at: string | null;
}

export interface BenchmarkRunSummary {
  id: string;
  template: TemplateName;
  parameters: Record<string, unknown>;
  speedup_factor: number | null;
  sim_time_ms: number;
  created_at: string;
}
