export type AgentName = 'claude' | 'openai' | 'gemini' | 'montecarlo' | 'quantum';

export const AGENT_LABELS: Record<AgentName, string> = {
  claude: 'Claude',
  openai: 'GPT-4o',
  gemini: 'Gemini',
  montecarlo: 'Monte Carlo',
  quantum: 'Quantum ⚛',
};

export const AGENT_COLORS: Record<AgentName, string> = {
  claude:     '#f97316', // orange
  openai:     '#22c55e', // green
  gemini:     '#3b82f6', // blue
  montecarlo: '#a855f7', // purple
  quantum:    '#06b6d4', // cyan
};

export interface TeamEntry {
  team_id: string;
  name: string;
  seed: number;
  region: string;
  record: string;
  conference: string;
  kenpom_rank: number | null;
  strength_of_schedule: number | null;
  recent_news?: string;
}

export interface Matchup {
  game_id: string;
  region_id: string;
  round: number;
  position: number;
  team_a: TeamEntry | null;
  team_b: TeamEntry | null;
  winner_advances_to: string | null;
}

export interface Region {
  name: string;
  region_id: string;
  matchups: Matchup[];
}

export interface BracketData {
  tournament_id: string;
  year: number;
  fetched_at: string;
  source: 'sportsdata_io' | 'static_fallback';
  regions: Region[];
  final_four: Matchup[];
  championship: Matchup | null;
}

export interface BracketPick {
  session_id: string;
  agent: AgentName;
  game_id: string;
  winner_team_id: string;
  winner_name: string;
  confidence: number;
  reasoning: string;
  pick_metadata?: Record<string, unknown>;
}

export interface CompletedBracket {
  session_id: string;
  agent: AgentName;
  picks: Record<string, BracketPick>;
  champion: TeamEntry | null;
  completed_at: string;
}

export interface AgentScore {
  agent: AgentName;
  methodology_score: number;
  upset_score: number;
  champion_rationale_score: number;
  total: number;
}

export interface EvaluationResult {
  session_id: string;
  scores: Record<string, AgentScore>;
  written_analysis: string;
}

// SSE event types from the backend
export type BracketSSEEvent =
  | { type: 'pick'; agent: AgentName; game_id: string; winner_team_id: string; winner_name: string; confidence: number; reasoning: string; round: number; circuit?: Record<string, unknown>; sim_data?: Record<string, unknown> }
  | { type: 'agent_complete'; agent: AgentName; champion: TeamEntry | null; picks: Record<string, BracketPick> }
  | { type: 'agent_done'; agent: AgentName }
  | { type: 'all_agents_complete'; credits_remaining?: number | null }
  | { type: 'evaluation_chunk'; chunk: string; done: boolean }
  | { type: 'evaluation_complete'; analysis: string }
  | { type: 'stream_done'; agent: AgentName };

export type AgentStatus = 'idle' | 'running' | 'complete' | 'error';
