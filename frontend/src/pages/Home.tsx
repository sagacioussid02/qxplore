import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';

// Update with your GitHub repo URL
const GITHUB_REPO = 'https://github.com/YOUR_USERNAME/quantumanic';
const GAMES = [
  {
    to: '/coin',
    icon: '🪙',
    title: 'Quantum Coin',
    subtitle: 'Superposition',
    description: 'A qubit in |+⟩ superposition collapses to |0⟩ or |1⟩ when observed. Real Qiskit H-gate circuit.',
    color: '#00ffff',
    bg: 'rgba(0,255,255,0.05)',
    border: 'rgba(0,255,255,0.2)',
    concept: '|0⟩ ── H ── Measure',
    cost: 10,
    inDev: false,
  },
  {
    to: '/roulette',
    icon: '🎡',
    title: 'Quantum Roulette',
    subtitle: 'Quantum Randomness',
    description: '6 qubits in superposition collapse to a true random 6-bit number. No pseudo-random seed, ever.',
    color: '#8b5cf6',
    bg: 'rgba(139,92,246,0.05)',
    border: 'rgba(139,92,246,0.2)',
    concept: 'H⊗6 → Measure → n mod 37',
    cost: 0,
    inDev: true,
  },
  {
    to: '/ttt',
    icon: '⊗',
    title: 'Quantum TTT',
    subtitle: 'Entanglement + Collapse',
    description: 'Each move places a quantum marker in two cells simultaneously. Cycles collapse via Qiskit measurement.',
    color: '#ec4899',
    bg: 'rgba(236,72,153,0.05)',
    border: 'rgba(236,72,153,0.2)',
    concept: 'Entanglement → Cycle → Collapse',
    cost: 45,
    inDev: false,
  },
  {
    to: '/circuit-ttt',
    icon: '🔬',
    title: 'Circuit TTT',
    subtitle: 'Gates + Measurement',
    description: 'Apply X, H, and CNOT gates to cells. Measure all qubits at once to collapse the board — then see who wins.',
    color: '#f59e0b',
    bg: 'rgba(245,158,11,0.05)',
    border: 'rgba(245,158,11,0.2)',
    concept: 'X | H | CNOT → Measure → Win',
    cost: 0,
    inDev: false,
  },
];

const PLATFORM = [
  {
    to: '/prep',
    icon: '🎓',
    title: 'Interview Prep',
    tagline: 'Practice quantum challenges — the skills IBM, Google, IonQ teams test',
    color: '#00ffff',
    bg: 'rgba(0,255,255,0.05)',
    border: 'rgba(0,255,255,0.2)',
  },
];

const CONCEPTS = [
  { icon: '🌊', name: 'Superposition', desc: 'A qubit can be |0⟩ and |1⟩ simultaneously until measured' },
  { icon: '🔗', name: 'Entanglement', desc: 'Two particles whose quantum states are correlated regardless of distance' },
  { icon: '👁', name: 'Measurement', desc: 'Observing a quantum state forces it to collapse to a definite value' },
  { icon: '〰', name: 'Interference', desc: 'Quantum amplitudes add and cancel like waves, enabling computation' },
];

export default function Home() {
  return (
    <div className="space-y-10 max-w-4xl">
      {/* Hero */}
      <div className="text-center py-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <h1 className="text-5xl font-mono font-bold">
            <span className="text-quantum-cyan" style={{ textShadow: '0 0 30px rgba(0,255,255,0.5)' }}>
              ⚛ Quantum
            </span>
            <span className="text-quantum-purple" style={{ textShadow: '0 0 30px rgba(139,92,246,0.4)' }}>
              {' '}Expedition
            </span>
          </h1>
          <p className="text-quantum-amber font-mono text-sm mt-1 tracking-widest uppercase opacity-70">
            into the Arcade
          </p>
          <p className="text-gray-400 text-lg mt-3 max-w-md mx-auto">
            Learn quantum computing through games. Every mechanic is backed by real quantum circuits.
          </p>
        </motion.div>
      </div>


      {/* Games */}
      <section>
        <h2 className="text-sm font-mono text-gray-500 uppercase tracking-wider mb-4">Arcade Games</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {GAMES.map((game, i) => (
            <motion.div
              key={game.to}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 + 0.3 }}
            >
              {game.inDev ? (
                <div
                  className="block card-quantum p-5 relative overflow-hidden opacity-60 cursor-not-allowed"
                  style={{ background: game.bg, borderColor: game.border }}
                >
                  <div className="absolute top-3 right-3 text-xs px-2 py-0.5 rounded-full font-mono border"
                       style={{ color: game.color, borderColor: game.border, background: game.bg }}>
                    In Development
                  </div>
                  <div className="text-4xl mb-3">{game.icon}</div>
                  <h3 className="font-mono font-bold text-lg" style={{ color: game.color }}>{game.title}</h3>
                  <p className="text-xs font-mono mb-2" style={{ color: game.color, opacity: 0.7 }}>{game.subtitle}</p>
                  <p className="text-gray-400 text-sm">{game.description}</p>
                  <p className="font-mono text-xs mt-3 opacity-50" style={{ color: game.color }}>{game.concept}</p>
                </div>
              ) : (
                <Link
                  to={game.to}
                  className="block card-quantum p-5 no-underline group transition-all duration-300 hover:scale-[1.02]"
                  style={{ background: game.bg, borderColor: game.border }}
                >
                  <div className="text-4xl mb-3">{game.icon}</div>
                  <h3 className="font-mono font-bold text-white text-lg group-hover:text-current transition-colors"
                      style={{ color: game.color }}>
                    {game.title}
                  </h3>
                  <p className="text-xs font-mono mb-2" style={{ color: game.color, opacity: 0.7 }}>{game.subtitle}</p>
                  <p className="text-gray-400 text-sm">{game.description}</p>
                  <div className="flex items-center justify-between mt-3">
                    <p className="font-mono text-xs opacity-50" style={{ color: game.color }}>{game.concept}</p>
                    <span className="text-xs font-mono opacity-60" style={{ color: game.color }}>
                      ⚛ {game.cost} credits
                    </span>
                  </div>
                </Link>
              )}
            </motion.div>
          ))}
        </div>
      </section>

      {/* Platform */}
      <section>
        <h2 className="text-sm font-mono text-gray-500 uppercase tracking-wider mb-4">Professional Tools</h2>
        <div className="grid grid-cols-1 gap-4">
          {PLATFORM.map((item, i) => (
            <motion.div
              key={item.to}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 + 0.5 }}
            >
              <Link
                to={item.to}
                className="block card-quantum p-5 no-underline group transition-all duration-300 hover:scale-[1.01]"
                style={{ background: item.bg, borderColor: item.border }}
              >
                <div className="flex items-center gap-4">
                  <span className="text-3xl">{item.icon}</span>
                  <div className="flex-1">
                    <h3 className="font-mono font-bold text-lg" style={{ color: item.color }}>{item.title}</h3>
                    <p className="text-gray-400 text-sm">{item.tagline}</p>
                  </div>
                  <span className="font-mono text-sm opacity-60 group-hover:translate-x-1 transition-transform" style={{ color: item.color }}>
                    →
                  </span>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Concepts */}
      <section>
        <h2 className="text-sm font-mono text-gray-500 uppercase tracking-wider mb-4">Quantum Concepts</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {CONCEPTS.map((c) => (
            <div key={c.name} className="card-quantum p-4 text-center">
              <div className="text-2xl mb-2">{c.icon}</div>
              <p className="font-mono text-sm font-semibold text-quantum-cyan">{c.name}</p>
              <p className="text-xs text-gray-500 mt-1">{c.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* AI agents note */}
      <div className="card-quantum p-4 border-l-2 border-quantum-purple">
        <p className="text-xs text-gray-500 font-mono mb-1">Powered by Claude AI Agents</p>
        <p className="text-sm text-gray-300">
          Every game includes a <span className="text-quantum-cyan font-mono">Quantum Tutor</span> (explains physics),{' '}
          <span className="text-quantum-purple font-mono">Game Master</span> (narrates dramatically),{' '}
          and a <span className="text-quantum-pink font-mono">Concept Q&A sidebar</span> (ask anything).
          The TTT AI opponent is also powered by Claude.
        </p>
      </div>

      {/* Contribute CTA */}
      <motion.a
        href={`${GITHUB_REPO}/blob/main/CONTRIBUTING.md`}
        target="_blank"
        rel="noopener noreferrer"
        className="block card-quantum p-5 no-underline group transition-all duration-300 hover:scale-[1.01]"
        style={{ background: 'rgba(0,255,255,0.03)', borderColor: 'rgba(0,255,255,0.2)' }}
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
      >
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xl">🎮</span>
              <span className="font-mono font-bold text-quantum-cyan">Add your own game!</span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 font-mono border border-cyan-500/20">
                Open Source
              </span>
            </div>
            <p className="text-gray-400 text-sm">
              Build a quantum game with Qiskit + Claude AI agents. Full setup guide — no API keys needed to get started.
            </p>
          </div>
          <span className="text-quantum-cyan font-mono text-sm group-hover:translate-x-1 transition-transform">
            Contribute →
          </span>
        </div>
      </motion.a>
    </div>
  );
}
