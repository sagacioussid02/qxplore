export type GateType = 'X' | 'H' | 'CNOT';
export type Player = 'X' | 'O';

export interface CircuitCell {
  index: number;
  owner: Player | null;
  gate: GateType | null;
  entangled_with: number | null;
  classical_value: number | null;    // 0 or 1 after measurement
  classical_owner: Player | null;    // owner if classical_value === 1
}

export interface CircuitMove {
  move_id: number;
  player: Player;
  gate: GateType;
  cells: number[];
}

export interface CircuitTTTGameState {
  game_id: string;
  board: CircuitCell[];
  moves: CircuitMove[];
  current_player: Player;
  turn_number: number;
  phase: 'placing' | 'game_over';
  winner: Player | 'draw' | null;
  is_vs_ai: boolean;
  ai_player: Player;
  measured: boolean;
  circuit_diagram: string | null;
}

export interface CircuitMoveResponse {
  game_state: CircuitTTTGameState;
  ai_move: CircuitMove | null;
}

export interface CircuitCollapseResponse {
  game_state: CircuitTTTGameState;
  measurement_bits: number[];
  circuit_diagram: string;
}
