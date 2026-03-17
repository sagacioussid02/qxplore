import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useBracketSession } from '../hooks/useBracketSession';
import { useBracketStore } from '../store/bracketStore';
import { useCreditStore } from '../store/creditStore';
import { AgentTabBar } from '../components/bracket/AgentTabBar';
import { AgentBracketView } from '../components/bracket/AgentBracketView';
import { CommissionerPanel } from '../components/bracket/CommissionerPanel';
import { AuthModal } from '../components/auth/AuthModal';
import { useAuth } from '../hooks/useAuth';
import type { AgentName } from '../types/bracket';
import { AGENT_COLORS } from '../types/bracket';

const AGENTS: AgentName[] = ['claude', 'openai', 'gemini', 'montecarlo', 'quantum'];
const BRACKET_COST = 450;

export default function NCAABracketPage() {
  const { isAuthenticated, accessToken, credits, refreshCredits } = useAuth();
  const { deductCredits } = useCreditStore();
  const [authOpen, setAuthOpen] = useState(false);

  const { loading, error, canResume, phase, startSession, startAllAgents, resumeAgents, cleanup } = useBracketSession({
    accessToken,
    onCreditsUpdate: refreshCredits,
  });
  const store = useBracketStore();

  useEffect(() => () => cleanup(), [cleanup]);

  // Check URL params for Stripe redirect
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('payment') === 'success') {
      refreshCredits();
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, [refreshCredits]);

  const agentStatuses = Object.fromEntries(
    AGENTS.map(a => [a, store.agents[a].status])
  ) as Record<AgentName, 'idle' | 'running' | 'complete' | 'error'>;

  const pickCounts = Object.fromEntries(
    AGENTS.map(a => [a, store.agents[a].pickCount])
  ) as Record<AgentName, number>;

  const champions = Object.fromEntries(
    AGENTS.map(a => [a, store.agents[a].champion])
  ) as Record<AgentName, { name: string } | null>;

  const activeAgent = store.activeTab;
  const activeAgentState = store.agents[activeAgent];
  const outOfCredits = isAuthenticated && credits !== null && credits <= 0;

  function handleStartAgents() {
    if (outOfCredits) return;
    if (!deductCredits(BRACKET_COST)) return;
    startAllAgents();
  }

  return (
    <div className="min-h-screen bg-[#0a0e1a] text-white p-4 md:p-6">
      <AuthModal open={authOpen} onClose={() => setAuthOpen(false)}
        prompt="Sign up to unlock live bracket data and get 1 free simulation." />

      {/* Header */}
      <div className="mb-6">
        <div className="flex items-start justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-white">
              🏀 NCAA Bracket Challenge
            </h1>
            <p className="text-gray-400 text-sm mt-1">
              5 AI agents compete to fill the 2025 NCAA Tournament bracket
            </p>
            {store.bracket && (
              <span className={`text-xs mt-1 inline-block px-2 py-0.5 rounded-full ${
                store.bracket.source === 'sportsdata_io'
                  ? 'bg-green-900/40 text-green-400'
                  : 'bg-yellow-900/40 text-yellow-500'
              }`}>
                {store.bracket.source === 'sportsdata_io' ? '⚡ Live Data' : '📁 Demo Data'}
              </span>
            )}
          </div>

          {/* Action buttons */}
          <div className="flex gap-2 items-center">
            {!store.sessionId ? (
              <button
                onClick={startSession}
                disabled={loading}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 rounded-lg text-sm font-semibold transition-colors"
              >
                {loading ? 'Loading bracket…' : '📋 Load Bracket'}
              </button>
            ) : phase === 'idle' ? (
              outOfCredits ? (
                // Out of credits — show buy button
                <button
                  onClick={() => setAuthOpen(true)}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 rounded-lg text-sm font-semibold transition-colors"
                >
                  ✦ Buy credits to run agents
                </button>
              ) : (
                <button
                  onClick={handleStartAgents}
                  className="px-4 py-2 bg-orange-600 hover:bg-orange-500 rounded-lg text-sm font-semibold transition-colors"
                >
                  ▶ Start All Agents
                </button>
              )
            ) : (
              <div className="flex items-center gap-2 text-sm text-gray-400">
                <motion.div
                  className="w-2 h-2 rounded-full bg-orange-400"
                  animate={{ opacity: phase === 'done' ? 1 : [1, 0.3, 1] }}
                  transition={{ repeat: phase === 'done' ? 0 : Infinity, duration: 1 }}
                />
                {phase === 'picking' && 'Agents picking…'}
                {phase === 'evaluating' && 'Commissioner evaluating…'}
                {phase === 'done' && '✓ Complete'}
              </div>
            )}

            {store.sessionId && (
              <button
                onClick={() => { cleanup(); store.reset(); startSession(); }}
                className="px-3 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-xs text-gray-300 transition-colors"
              >
                ↺ Reset
              </button>
            )}
          </div>
        </div>

        {/* Anonymous demo banner */}
        {store.bracket && store.isAnonymous && (
          <motion.div
            className="mt-3 flex items-center justify-between gap-3 px-4 py-2.5 bg-indigo-950/60 border border-indigo-700/40 rounded-lg"
            initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}
          >
            <p className="text-sm text-indigo-300">
              <span className="font-semibold">Demo mode</span> — running on static bracket data.
              Sign up to unlock live data + 1 free simulation.
            </p>
            <button
              onClick={() => setAuthOpen(true)}
              className="shrink-0 px-3 py-1 bg-indigo-600 hover:bg-indigo-500 rounded-md text-xs font-semibold text-white transition-colors"
            >
              Sign up free
            </button>
          </motion.div>
        )}

        {error && (
          <div className="mt-3 px-3 py-2 bg-red-900/30 border border-red-700/40 rounded-lg text-red-400 text-sm flex items-center justify-between gap-3">
            <span>{error}</span>
            <div className="flex gap-2 shrink-0">
              {canResume && (
                <button
                  onClick={resumeAgents}
                  className="px-3 py-1 bg-orange-600 hover:bg-orange-500 rounded-md text-xs font-semibold text-white"
                >
                  ↺ Resume
                </button>
              )}
              {!isAuthenticated && error.includes('credits') && (
                <button onClick={() => setAuthOpen(true)}
                  className="px-3 py-1 bg-indigo-600 hover:bg-indigo-500 rounded-md text-xs font-semibold text-white">
                  Sign up
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {!store.bracket && !loading && (
        <div className="text-center py-24 text-gray-500">
          <div className="text-5xl mb-4">🏀</div>
          <p className="text-lg">Load the bracket to begin the challenge</p>
          <p className="text-sm mt-2">Claude, GPT-4o, Gemini, Monte Carlo, and Quantum will each fill the bracket</p>
          <p className="text-xs mt-3 text-gray-600">No sign-up needed to try the demo</p>
        </div>
      )}

      {store.bracket && (
        <div className="flex flex-col gap-5">
          {/* Agent tabs */}
          <AgentTabBar
            activeTab={activeAgent}
            onSelect={(a) => store.setActiveTab(a)}
            agentStatuses={agentStatuses}
            pickCounts={pickCounts}
            champions={champions}
          />

          {/* Active agent bracket view */}
          <AnimatePresence mode="wait">
            <motion.div
              key={activeAgent}
              className="bg-gray-900/40 border rounded-xl p-4 min-h-[500px] overflow-hidden w-full"
              style={{ borderColor: AGENT_COLORS[activeAgent] + '33' }}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
            >
              <AgentBracketView
                agent={activeAgent}
                bracket={store.bracket}
                picks={activeAgentState.picks}
                champion={activeAgentState.champion}
                pickCount={activeAgentState.pickCount}
                liveReasoning={activeAgentState.liveReasoning}
                status={activeAgentState.status}
              />
            </motion.div>
          </AnimatePresence>

          {/* Consensus bar — shown when 2+ agents are done */}
          {Object.values(agentStatuses).filter(s => s === 'complete').length >= 2 && (
            <div className="flex items-center gap-2 text-xs text-gray-500 px-1">
              <span className="text-gray-600">Agreement:</span>
              {AGENTS.map(a => (
                <div
                  key={a}
                  className="w-4 h-4 rounded-full flex items-center justify-center text-[8px] font-bold"
                  style={{
                    backgroundColor: agentStatuses[a] === 'complete' ? AGENT_COLORS[a] + '33' : 'transparent',
                    border: `1px solid ${AGENT_COLORS[a]}${agentStatuses[a] === 'complete' ? 'aa' : '22'}`,
                    color: AGENT_COLORS[a],
                  }}
                  title={a}
                >
                  {a[0].toUpperCase()}
                </div>
              ))}
              <span className="ml-2 text-gray-600">
                {Object.values(agentStatuses).filter(s => s === 'complete').length}/5 done
              </span>
            </div>
          )}

          {/* Commissioner panel */}
          <CommissionerPanel
            text={store.evaluationText}
            done={store.evaluationDone}
            phase={phase}
          />
        </div>
      )}
    </div>
  );
}
