export type TTLPlayer = 'X' | 'O';
export type TTTPhase = 'placing' | 'cycle_detected' | 'collapsing' | 'game_over';

export interface QuantumMarker {
  move_id: number;
  player: TTLPlayer;
  partner_cell: number;
  collapsed: boolean;
}

export interface TTTCell {
  index: number;
  markers: QuantumMarker[];
  classical_owner: TTLPlayer | null;
  is_collapsing: boolean;
}

export interface EntangledMove {
  move_id: number;
  player: TTLPlayer;
  cells: [number, number];
  turn_number: number;
}

export interface TTTGameState {
  game_id: string;
  board: TTTCell[];
  moves: EntangledMove[];
  current_player: TTLPlayer;
  turn_number: number;
  phase: TTTPhase;
  detected_cycle: number[] | null;
  winner: TTLPlayer | 'draw' | null;
  is_vs_ai: boolean;
  ai_player: TTLPlayer | null;
}

export interface MoveResponse {
  game_state: TTTGameState;
  cycle_detected: boolean;
  collapse_triggered: boolean;
  ai_move: number[] | null;
}

export type RouletteColor = 'green' | 'red' | 'black';
export type RoulettePhase = 'idle' | 'betting' | 'spinning' | 'revealing' | 'done';
