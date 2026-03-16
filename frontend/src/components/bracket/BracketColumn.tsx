import { motion, AnimatePresence } from 'framer-motion';
import type { Matchup, BracketPick, AgentName } from '../../types/bracket';
import { AGENT_COLORS } from '../../types/bracket';

interface Props {
  matchups: Matchup[];
  picks: Record<string, BracketPick>;
  agent: AgentName;
  roundLabel: string;
}

const ROUND_LABELS: Record<number, string> = {
  1: 'Round of 64',
  2: 'Round of 32',
  3: 'Sweet 16',
  4: 'Elite 8',
  5: 'Final Four',
  6: 'Championship',
};

function MatchupCard({ matchup, pick, agent }: { matchup: Matchup; pick?: BracketPick; agent: AgentName }) {
  const color = AGENT_COLORS[agent];
  const winner = pick?.winner_team_id;

  const TeamRow = ({ team, isWinner }: { team: { name: string; seed: number; team_id: string } | null; isWinner: boolean }) => {
    if (!team) return (
      <div className="flex items-center gap-2 px-2 py-1 rounded text-gray-600 text-xs">
        <span className="w-5 text-center">?</span>
        <span>TBD</span>
      </div>
    );
    return (
      <motion.div
        className={`flex items-center gap-2 px-2 py-1 rounded text-xs transition-all ${
          isWinner
            ? 'font-bold text-white'
            : winner
            ? 'text-gray-500 opacity-60'
            : 'text-gray-300'
        }`}
        style={isWinner ? { backgroundColor: color + '33', borderLeft: `3px solid ${color}` } : {}}
        initial={isWinner ? { scale: 0.95, opacity: 0 } : {}}
        animate={isWinner ? { scale: 1, opacity: 1 } : {}}
        transition={{ duration: 0.3 }}
      >
        <span className="w-5 text-center text-gray-400 font-mono text-[10px]">{team.seed}</span>
        <span className="truncate max-w-[100px]">{team.name}</span>
        {isWinner && pick && (
          <span className="ml-auto text-[10px] opacity-70">{Math.round(pick.confidence * 100)}%</span>
        )}
      </motion.div>
    );
  };

  const isAWinner = winner === matchup.team_a?.team_id;
  const isBWinner = winner === matchup.team_b?.team_id;

  return (
    <div className="bg-gray-800/60 border border-gray-700/40 rounded-lg overflow-hidden my-1">
      <TeamRow team={matchup.team_a} isWinner={isAWinner} />
      <div className="border-t border-gray-700/40" />
      <TeamRow team={matchup.team_b} isWinner={isBWinner} />
      {pick?.reasoning && (
        <div className="px-2 py-1 text-[9px] text-gray-500 border-t border-gray-700/30 truncate" title={pick.reasoning}>
          {pick.reasoning.slice(0, 60)}…
        </div>
      )}
    </div>
  );
}

export function BracketColumn({ matchups, picks, agent, roundLabel }: Props) {
  const round = matchups[0]?.round ?? 1;
  return (
    <div className="min-w-[160px] flex flex-col">
      <div className="text-[10px] text-gray-500 text-center mb-2 font-semibold uppercase tracking-wider">
        {ROUND_LABELS[round] ?? roundLabel}
      </div>
      <div className="flex flex-col justify-around flex-1 gap-1">
        {matchups.map(m => (
          <MatchupCard key={m.game_id} matchup={m} pick={picks[m.game_id]} agent={agent} />
        ))}
      </div>
    </div>
  );
}
