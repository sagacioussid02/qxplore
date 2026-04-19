import { useState } from 'react';
import { motion } from 'framer-motion';
import { useChallengeList } from '../hooks/useChallenge';
import { ChallengeCard } from '../components/prep/ChallengeCard';
import type { Category, Difficulty } from '../types/challenge';

const CATEGORIES: { value: Category | ''; label: string }[] = [
  { value: '', label: 'All' },
  { value: 'fundamentals', label: 'Fundamentals' },
  { value: 'construction', label: 'Construction' },
  { value: 'algorithm', label: 'Algorithms' },
  { value: 'optimization', label: 'Optimization' },
];

const DIFFICULTIES: { value: Difficulty | ''; label: string }[] = [
  { value: '', label: 'All' },
  { value: 'beginner', label: 'Beginner' },
  { value: 'intermediate', label: 'Intermediate' },
  { value: 'advanced', label: 'Advanced' },
  { value: 'expert', label: 'Expert' },
];

export default function PrepPage() {
  const [category, setCategory] = useState<Category | ''>('');
  const [difficulty, setDifficulty] = useState<Difficulty | ''>('');

  const { challenges, loading, error } = useChallengeList(
    category || undefined,
    difficulty || undefined,
  );

  return (
    <div className="space-y-8 max-w-4xl">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-3xl font-mono font-bold text-quantum-cyan">
          ⚛ Interview Prep
        </h1>
        <p className="text-gray-400 mt-1 text-sm">
          Practice quantum computing challenges — the exact skills IBM Quantum, Google, IonQ, and AWS Braket teams test.
        </p>
      </motion.div>

      {/* Subscription callout */}
      <div className="card-quantum p-4 border-l-2 border-quantum-purple text-sm text-gray-400 flex items-center justify-between flex-wrap gap-3">
        <div>
          <span className="text-quantum-purple font-mono font-bold">Free tier</span>
          {' '}— 3 submissions/month · no hints · no leaderboard.{' '}
          <span className="text-gray-300">Prep ($39/mo)</span> unlocks everything.
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-4 flex-wrap items-center">
        <div className="flex gap-2 flex-wrap">
          <span className="text-xs text-gray-500 font-mono self-center">Category:</span>
          {CATEGORIES.map(c => (
            <button
              key={c.value}
              onClick={() => setCategory(c.value as Category | '')}
              className="text-xs font-mono px-3 py-1 rounded-full border transition-all"
              style={
                category === c.value
                  ? { borderColor: '#00ffff', color: '#00ffff', background: 'rgba(0,255,255,0.1)' }
                  : { borderColor: 'rgba(255,255,255,0.1)', color: '#6b7280' }
              }
            >
              {c.label}
            </button>
          ))}
        </div>
        <div className="flex gap-2 flex-wrap">
          <span className="text-xs text-gray-500 font-mono self-center">Difficulty:</span>
          {DIFFICULTIES.map(d => (
            <button
              key={d.value}
              onClick={() => setDifficulty(d.value as Difficulty | '')}
              className="text-xs font-mono px-3 py-1 rounded-full border transition-all"
              style={
                difficulty === d.value
                  ? { borderColor: '#8b5cf6', color: '#8b5cf6', background: 'rgba(139,92,246,0.1)' }
                  : { borderColor: 'rgba(255,255,255,0.1)', color: '#6b7280' }
              }
            >
              {d.label}
            </button>
          ))}
        </div>
      </div>

      {/* Challenge grid */}
      {loading && (
        <p className="text-gray-600 font-mono text-sm animate-pulse">Loading challenges…</p>
      )}
      {error && (
        <p className="text-red-400 font-mono text-sm">Error: {error}</p>
      )}
      {!loading && !error && (
        <>
          <p className="text-xs font-mono text-gray-600">{challenges.length} challenge{challenges.length !== 1 ? 's' : ''}</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {challenges.map((ch, i) => (
              <ChallengeCard key={ch.slug} challenge={ch} index={i} />
            ))}
          </div>
          {challenges.length === 0 && (
            <p className="text-gray-600 font-mono text-sm text-center py-8">
              No challenges match the selected filters.
            </p>
          )}
        </>
      )}
    </div>
  );
}
