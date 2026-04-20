import type { LeaderboardEntry } from '../../types/challenge';

interface Props {
  entries: LeaderboardEntry[];
  currentUserId?: string;
}

export function LeaderboardTable({ entries, currentUserId }: Props) {
  if (entries.length === 0) {
    return (
      <p className="text-xs font-mono text-gray-600 text-center py-4">
        No submissions yet — be the first!
      </p>
    );
  }

  return (
    <table className="w-full text-xs font-mono">
      <thead>
        <tr className="text-gray-600 border-b border-gray-800">
          <th className="text-left pb-2 w-8">#</th>
          <th className="text-left pb-2">Player</th>
          <th className="text-right pb-2">Score</th>
          <th className="text-right pb-2">Gates</th>
        </tr>
      </thead>
      <tbody>
        {entries.map(e => {
          const isMe = e.user_id === currentUserId;
          return (
            <tr
              key={e.user_id}
              className="border-b border-gray-800/50"
              style={isMe ? { background: 'rgba(0,255,255,0.06)' } : undefined}
            >
              <td className="py-2 text-gray-500">{e.rank}</td>
              <td className="py-2" style={{ color: isMe ? '#00ffff' : '#d1d5db' }}>
                {e.display_name ?? 'Anonymous'}
                {isMe && <span className="text-quantum-cyan ml-1 opacity-60">(you)</span>}
              </td>
              <td className="py-2 text-right text-white">{e.best_score}</td>
              <td className="py-2 text-right text-gray-500">{e.best_gates}g</td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
