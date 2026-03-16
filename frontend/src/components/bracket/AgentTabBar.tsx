import { motion } from 'framer-motion';
import type { AgentName } from '../../types/bracket';
import { AGENT_LABELS, AGENT_COLORS } from '../../types/bracket';

const AGENTS: AgentName[] = ['claude', 'openai', 'gemini', 'montecarlo', 'quantum'];

interface Props {
  activeTab: AgentName;
  onSelect: (agent: AgentName) => void;
  agentStatuses: Record<AgentName, 'idle' | 'running' | 'complete' | 'error'>;
  pickCounts: Record<AgentName, number>;
  champions: Record<AgentName, { name: string } | null>;
}

const STATUS_ICONS: Record<string, string> = {
  idle: '○',
  running: '◎',
  complete: '●',
  error: '✕',
};

export function AgentTabBar({ activeTab, onSelect, agentStatuses, pickCounts, champions }: Props) {
  return (
    <div className="flex gap-1 bg-gray-900/60 p-1 rounded-xl border border-gray-700/40">
      {AGENTS.map(agent => {
        const isActive = agent === activeTab;
        const color = AGENT_COLORS[agent];
        const status = agentStatuses[agent];
        const champion = champions[agent];

        return (
          <button
            key={agent}
            onClick={() => onSelect(agent)}
            className={`relative flex-1 flex flex-col items-center px-2 py-2 rounded-lg text-xs transition-all ${
              isActive ? 'text-white' : 'text-gray-400 hover:text-gray-200'
            }`}
            style={isActive ? { backgroundColor: color + '22', boxShadow: `0 0 12px ${color}44` } : {}}
          >
            {isActive && (
              <motion.div
                className="absolute inset-0 rounded-lg"
                style={{ border: `1px solid ${color}66` }}
                layoutId="activeTab"
                transition={{ type: 'spring', stiffness: 400, damping: 30 }}
              />
            )}
            <span className="font-semibold relative z-10">{AGENT_LABELS[agent]}</span>
            <div className="flex items-center gap-1 relative z-10 mt-0.5">
              <span
                className="text-[10px]"
                style={{ color: status === 'complete' ? color : status === 'running' ? color : 'gray' }}
              >
                {STATUS_ICONS[status]}
              </span>
              {status === 'running' && (
                <span className="text-[9px] text-gray-500">{pickCounts[agent]}/63</span>
              )}
              {status === 'complete' && champion && (
                <span className="text-[9px]" style={{ color }} title={`Champion: ${champion.name}`}>
                  🏆 {champion.name.split(' ').pop()}
                </span>
              )}
            </div>
          </button>
        );
      })}
    </div>
  );
}
