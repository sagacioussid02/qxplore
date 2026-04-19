export type Category = 'fundamentals' | 'construction' | 'algorithm' | 'optimization';
export type Difficulty = 'beginner' | 'intermediate' | 'advanced' | 'expert';

export interface ChallengeListItem {
  slug: string;
  title: string;
  category: Category;
  difficulty: Difficulty;
  optimal_gates: number | null;
}

export interface ChallengeConstraints {
  max_qubits: number;
  max_gates: number;
  time_limit_seconds: number;
}

export interface ChallengeDetail {
  slug: string;
  title: string;
  category: Category;
  difficulty: Difficulty;
  description: string;
  hints: string[];
  constraints: ChallengeConstraints;
  expected_sv: [number, number][] | null;
  optimal_gates: number | null;
}

export interface GateInstruction {
  type: string;
  qubit: number;
  step: number;
  target?: number;
}

export interface ScoringResult {
  score: number;
  correctness: number;
  efficiency: number;
  speed_score: number;
  passed: boolean;
  fidelity: number;
  gate_count: number;
  circuit_qasm: string | null;
  submission_id: string | null;
}

export interface LeaderboardEntry {
  rank: number;
  display_name: string | null;
  best_score: number;
  best_gates: number;
  user_id: string;
}

export interface UserSubmission {
  id: string;
  challenge_id: string;
  score: number;
  correctness: number;
  efficiency: number;
  speed_score: number;
  time_taken_s: number;
  passed: boolean;
  submitted_at: string;
}
