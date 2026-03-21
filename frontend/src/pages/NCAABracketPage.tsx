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

  const { loading, error, evaluationError, canResume, phase, isDemoMode, startSession, startAllAgents, startDemoAgents, resumeAgents, startSingleAgent, completeAgentRandomly, runCommissioner, cleanup } = useBracketSession({
    accessToken,
    onCreditsUpdate: refreshCredits,
  });
  const store = useBracketStore();

  useEffect(() => () => cleanup(), [cleanup]);

  // Fulfill payment after Stripe redirect — works with or without session_id in URL
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('payment') !== 'success' || !accessToken) return;
    window.history.replaceState({}, '', window.location.pathname);

    const stripeSessionId = params.get('session_id');

    const fulfill = async () => {
      const { apiClient } = await import('../api/client');
      try {
        if (stripeSessionId) {
          // New flow: verify specific session
          const r = await apiClient.post(
            `/stripe/verify-payment?stripe_session_id=${encodeURIComponent(stripeSessionId)}`,
            {},
            { headers: { Authorization: `Bearer ${accessToken}` } },
          );
          if (r.data?.credits != null) refreshCredits();
        } else {
          // Old/fallback flow: scan for any unprocessed payment
          const r = await apiClient.post(
            '/stripe/fulfill-pending',
            {},
            { headers: { Authorization: `Bearer ${accessToken}` } },
          );
          if (r.data?.credits != null) refreshCredits();
        }
      } catch {
        refreshCredits();
      }
    };

    fulfill();
  }, [accessToken, refreshCredits]);

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
  const outOfCredits = isAuthenticated && credits !== null && credits < BRACKET_COST;
  const completedCount = AGENTS.filter(a => store.agents[a].status === 'complete').length;
  const hasPartialResults = completedCount > 0 && phase === 'idle';

  function handleStartAgents() {
    if (outOfCredits) return;
    // Authenticated users: server manages credits, skip local gate
    if (!isAuthenticated && !deductCredits(BRACKET_COST)) return;
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
              5 AI agents compete to fill the 2026 NCAA Tournament bracket
            </p>
            {store.bracket && (
              <span className={`text-xs mt-1 inline-block px-2 py-0.5 rounded-full ${
                store.bracket.source === 'sportsdata_io'
                  ? 'bg-green-900/40 text-green-400'
                  : 'bg-yellow-900/40 text-yellow-500'
              }`}>
                {store.bracket.source === 'sportsdata_io' ? '⚡ Live Data' : '📋 NCAA Released Data 2026'}
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
              !isAuthenticated ? (
                // Anonymous — offer free demo
                <button
                  onClick={startDemoAgents}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 rounded-lg text-sm font-semibold transition-colors"
                >
                  ▶ Try Free Demo
                </button>
              ) : outOfCredits ? (
                // Authenticated but out of credits
                <button
                  onClick={() => setAuthOpen(true)}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 rounded-lg text-sm font-semibold transition-colors"
                >
                  ✦ Buy credits to run agents
                </button>
              ) : (
                // Authenticated + credits — live run
                <button
                  onClick={handleStartAgents}
                  className="px-4 py-2 bg-orange-600 hover:bg-orange-500 rounded-lg text-sm font-semibold transition-colors"
                >
                  ▶ Start All Agents ({BRACKET_COST} credits)
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

        {/* Banner for anonymous users */}
        {store.bracket && !isAuthenticated && (
          <AnimatePresence mode="wait">
            {isDemoMode && phase === 'done' ? (
              // Post-demo CTA — prominent sign-up prompt
              <motion.div
                key="post-demo-cta"
                className="mt-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 px-4 py-3 bg-gradient-to-r from-indigo-950/80 to-purple-950/80 border border-indigo-500/50 rounded-lg"
                initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}
              >
                <div>
                  <p className="text-sm font-semibold text-white">
                    Liked the demo? Run it for real. 🏀
                  </p>
                  <p className="text-xs text-indigo-300 mt-0.5">
                    Sign up for credits to run all 5 agents on live 2026 tournament data — real stats, real news, real picks.
                  </p>
                </div>
                <button
                  onClick={() => setAuthOpen(true)}
                  className="shrink-0 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 rounded-lg text-sm font-semibold text-white transition-colors whitespace-nowrap"
                >
                  Sign up free →
                </button>
              </motion.div>
            ) : (
              // Pre-demo hint banner
              <motion.div
                key="pre-demo-hint"
                className="mt-3 flex items-center justify-between gap-3 px-4 py-2.5 bg-indigo-950/60 border border-indigo-700/40 rounded-lg"
                initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}
              >
                <p className="text-sm text-indigo-300">
                  <span className="font-semibold">Free demo</span> — precomputed picks, no live agent calls.
                  Sign up to unlock live agents generating fresh picks on real 2026 data.
                </p>
                <button
                  onClick={() => setAuthOpen(true)}
                  className="shrink-0 px-3 py-1 bg-indigo-600 hover:bg-indigo-500 rounded-md text-xs font-semibold text-white transition-colors"
                >
                  Sign up free
                </button>
              </motion.div>
            )}
          </AnimatePresence>
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
              {hasPartialResults && !canResume && (
                <button
                  onClick={runCommissioner}
                  className="px-3 py-1 bg-purple-600 hover:bg-purple-500 rounded-md text-xs font-semibold text-white"
                >
                  ⚖ Run Commissioner ({completedCount}/5)
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

          {/* Per-agent controls — shown when any agent hasn't completed and we're idle */}
          {phase === 'idle' && completedCount > 0 && AGENTS.some(a => agentStatuses[a] !== 'complete' && agentStatuses[a] !== 'running') && (
            <div className="flex flex-wrap gap-2 px-1 items-center">
              <span className="text-xs text-gray-500">Individual agents:</span>
              {AGENTS.filter(a => agentStatuses[a] !== 'complete' && agentStatuses[a] !== 'running').map(a => (
                <div key={a} className="flex gap-1">
                  <button
                    onClick={() => startSingleAgent(a)}
                    className="px-2.5 py-1 text-xs font-semibold rounded-l-md transition-colors text-white"
                    style={{ backgroundColor: AGENT_COLORS[a] + 'cc' }}
                    title={`Resume ${a} from checkpoint`}
                  >
                    ↺ {a.charAt(0).toUpperCase() + a.slice(1)}
                  </button>
                  <button
                    onClick={() => completeAgentRandomly(a)}
                    className="px-2 py-1 text-xs font-semibold rounded-r-md transition-colors text-white bg-gray-600 hover:bg-gray-500 border-l border-black/20"
                    title={`Fill ${a}'s remaining picks with seed-based random`}
                  >
                    🎲
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Evaluation error */}
          {evaluationError && (
            <div className="px-3 py-2 bg-yellow-900/30 border border-yellow-700/40 rounded-lg text-yellow-400 text-sm flex items-center justify-between gap-3">
              <span>{evaluationError}</span>
              {completedCount > 0 && (
                <button
                  onClick={runCommissioner}
                  className="shrink-0 px-3 py-1 bg-purple-600 hover:bg-purple-500 rounded-md text-xs font-semibold text-white"
                >
                  ↺ Retry Commissioner
                </button>
              )}
            </div>
          )}

          {/* Commissioner Panel */}
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
