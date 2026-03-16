import { motion } from 'framer-motion';
import type { BracketData, BracketPick, AgentName, TeamEntry } from '../../types/bracket';
import { AGENT_COLORS, AGENT_LABELS } from '../../types/bracket';
import { TournamentBracket } from './TournamentBracket';

interface Props {
  agent: AgentName;
  bracket: BracketData;
  picks: Record<string, BracketPick>;
  champion: TeamEntry | null;
  pickCount: number;
  liveReasoning: string;
  status: 'idle' | 'running' | 'complete' | 'error';
}

const TOTAL_GAMES = 63;

export function AgentBracketView({ agent, bracket, picks, champion, pickCount, liveReasoning, status }: Props) {
  const color = AGENT_COLORS[agent];
  const progress = Math.round((pickCount / TOTAL_GAMES) * 100);

  return (
    <div className="flex flex-col gap-3">
      {/* Status bar */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          {status === 'running' && (
            <motion.div className="w-2 h-2 rounded-full" style={{ backgroundColor: color }}
              animate={{ opacity: [1, 0.3, 1] }} transition={{ repeat: Infinity, duration: 0.9 }} />
          )}
          {status === 'complete' && <div className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />}
          {(status === 'idle' || status === 'error') && <div className="w-2 h-2 rounded-full bg-gray-600" />}
          <span className="text-xs font-semibold" style={{ color }}>{AGENT_LABELS[agent]}</span>
          <span className="text-xs text-gray-500">
            {status === 'idle' && 'waiting…'}
            {status === 'running' && `${pickCount}/${TOTAL_GAMES} picks`}
            {status === 'complete' && `${pickCount} picks — done`}
            {status === 'error' && 'error'}
          </span>
        </div>

        {/* Progress bar */}
        <div className="flex-1 min-w-[120px] h-1 bg-gray-700 rounded-full overflow-hidden">
          <motion.div className="h-full rounded-full" style={{ backgroundColor: color }}
            animate={{ width: `${progress}%` }} transition={{ duration: 0.3 }} />
        </div>

        {/* Champion badge */}
        {champion && (
          <motion.div
            className="flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-bold"
            style={{ backgroundColor: color + '20', border: `1px solid ${color}55`, color }}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
          >
            🏆 {champion.name} <span className="font-normal text-gray-400">(#{champion.seed})</span>
          </motion.div>
        )}
      </div>

      {/* Live reasoning ticker */}
      {status === 'running' && liveReasoning && (
        <motion.div
          className="text-[10px] text-gray-500 italic px-2 py-1 rounded bg-gray-800/40 border border-gray-700/30 truncate"
          key={liveReasoning}
          initial={{ opacity: 0.5 }}
          animate={{ opacity: 1 }}
        >
          ↳ {liveReasoning.slice(0, 120)}
        </motion.div>
      )}

      {/* The bracket */}
      <TournamentBracket bracket={bracket} picks={picks} agent={agent} />
    </div>
  );
}
