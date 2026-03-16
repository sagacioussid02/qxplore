export type AgentType = 'tutor' | 'game_master' | 'concept_qa';

export interface AgentMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface StreamChunk {
  chunk: string;
  done: boolean;
}

export interface TutorContext {
  event_type:
    | 'coin_flip'
    | 'roulette_spin'
    | 'ttt_quantum_move'
    | 'ttt_cycle'
    | 'ttt_collapse'
    | 'ttt_win';
  game_state: Record<string, unknown>;
  quantum_result?: Record<string, unknown>;
  player_action?: string;
}

export interface GameMasterEvent {
  event_type:
    | 'spin_start'
    | 'spin_result'
    | 'ttt_cycle'
    | 'ttt_collapse'
    | 'ttt_win'
    | 'coin_flip';
  details: Record<string, unknown>;
  drama_level?: 'low' | 'medium' | 'high';
}
