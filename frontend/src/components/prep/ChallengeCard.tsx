import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import type { ChallengeListItem, Difficulty } from '../../types/challenge';

const DIFFICULTY_COLOR: Record<Difficulty, string> = {
  beginner: '#22c55e',
  intermediate: '#eab308',
  advanced: '#f97316',
  expert: '#ec4899',
};

const CATEGORY_ICON: Record<string, string> = {
  fundamentals: '⚛',
  construction: '🔧',
  algorithm: '⚡',
  optimization: '🏆',
};

interface Props {
  challenge: ChallengeListItem;
  bestScore?: number | null;
  index: number;
}

export function ChallengeCard({ challenge, bestScore, index }: Props) {
  const color = DIFFICULTY_COLOR[challenge.difficulty];
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
    >
      <Link
        to={`/prep/${challenge.slug}`}
        className="block card-quantum p-4 no-underline group hover:scale-[1.02] transition-all duration-200"
        style={{ borderColor: `${color}33`, background: `${color}08` }}
      >
        <div className="flex items-start justify-between mb-2">
          <span className="text-xl">{CATEGORY_ICON[challenge.category] ?? '⚛'}</span>
          <span
            className="text-xs font-mono px-2 py-0.5 rounded-full border capitalize"
            style={{ color, borderColor: `${color}60`, background: `${color}15` }}
          >
            {challenge.difficulty}
          </span>
        </div>

        <h3 className="font-mono font-bold text-white group-hover:opacity-80 text-sm mb-1">
          {challenge.title}
        </h3>
        <p className="text-xs font-mono capitalize" style={{ color, opacity: 0.7 }}>
          {challenge.category}
        </p>

        <div className="flex items-center justify-between mt-3">
          {bestScore != null ? (
            <span className="text-xs font-mono text-green-400">
              ✓ Best: {bestScore}
            </span>
          ) : (
            <span className="text-xs font-mono text-gray-600">Not attempted</span>
          )}
          {challenge.optimal_gates != null && (
            <span className="text-xs font-mono text-gray-500">
              par {challenge.optimal_gates}g
            </span>
          )}
        </div>
      </Link>
    </motion.div>
  );
}
