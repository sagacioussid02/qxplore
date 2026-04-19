import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { rsaApi } from '../api/rsaApi';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../lib/supabase';
import type {
  KeygenResponse, EncryptResponse, DecryptResponse,
  ClassicalFactorResponse, ShorResponse, ShorMeasurement,
} from '../api/rsaApi';

// ── Preset prime pairs ─────────────────────────────────────────────────────────
// tier: 'free' | 'login' | 'paid'
const PRIME_PRESETS = [
  { label: 'Tiny  (n=15)',  p: 3,  q: 5,  desc: 'Eve cracks this in 2 tries',         tier: 'free'  as const },
  { label: 'Small (n=77)',  p: 7,  q: 11, desc: 'Still easy for Eve — 8 tries',        tier: 'free'  as const },
  { label: 'Medium (n=221)',p: 13, q: 17, desc: 'Getting harder — 13 tries',           tier: 'login' as const },
  { label: 'Large (n=3599)',p: 59, q: 61, desc: 'RSA-scale demo — 100 ⚛ credits',     tier: 'paid'  as const },
];

// ── Helpers ───────────────────────────────────────────────────────────────────
function StepReveal({ steps, color = 'text-quantum-cyan' }: { steps: string[]; color?: string }) {
  const [visible, setVisible] = useState(0);
  useEffect(() => {
    setVisible(0);
    if (steps.length === 0) return;
    let i = 0;
    const id = setInterval(() => {
      i += 1;
      setVisible(i);
      if (i >= steps.length) clearInterval(id);
    }, 350);
    return () => clearInterval(id);
  }, [steps]);

  return (
    <div className="space-y-1 font-mono text-sm">
      {steps.slice(0, visible).map((s, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, x: -8 }}
          animate={{ opacity: 1, x: 0 }}
          className={i === visible - 1 ? color : 'text-gray-400'}
        >
          {s}
        </motion.div>
      ))}
    </div>
  );
}

function SectionCard({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-xl border border-quantum-border bg-quantum-surface p-6 ${className}`}>
      {children}
    </div>
  );
}

function SectionHeader({ icon, title, subtitle }: { icon: string; title: string; subtitle: string }) {
  return (
    <div className="mb-4">
      <h2 className="text-xl font-bold font-mono text-white flex items-center gap-2">
        <span className="text-2xl">{icon}</span> {title}
      </h2>
      <p className="text-sm text-gray-400 mt-0.5 ml-8">{subtitle}</p>
    </div>
  );
}

// ── Alice / Bob / Eve actor badges ────────────────────────────────────────────
function Actor({ name, color, emoji }: { name: string; color: string; emoji: string }) {
  return (
    <div className={`flex flex-col items-center gap-1 px-4 py-2 rounded-lg border ${color} text-center min-w-[72px]`}>
      <span className="text-2xl">{emoji}</span>
      <span className="text-xs font-mono font-bold">{name}</span>
    </div>
  );
}

// ── Measurement bar chart for Shor ────────────────────────────────────────────
function MeasurementChart({ measurements, shots }: { measurements: ShorMeasurement[]; shots: number }) {
  const top = measurements.slice(0, 6);
  const maxCount = Math.max(...top.map(m => m.count));
  return (
    <div className="space-y-2">
      <p className="text-xs text-gray-500 font-mono">QPE register measurements ({shots} shots)</p>
      {top.map((m, i) => (
        <div key={i} className="flex items-center gap-2 font-mono text-xs">
          <span className="w-10 text-gray-400">{m.bitstring}</span>
          <div className="flex-1 bg-quantum-dark rounded-full h-4 overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${(m.count / maxCount) * 100}%` }}
              transition={{ duration: 0.6, delay: i * 0.1 }}
              className="h-full bg-quantum-cyan rounded-full"
            />
          </div>
          <span className="w-8 text-right text-gray-400">{m.count}</span>
          <span className="w-20 text-quantum-purple">φ={m.phase.toFixed(3)}</span>
          <span className="text-gray-500">r?={m.period_candidate}</span>
        </div>
      ))}
    </div>
  );
}

// ── Large-n comparison explainer ───────────────────────────────────────────────
function ScaleComparison({ n }: { n: number }) {
  const rows = [
    { label: `Your n = ${n}`, steps: Math.ceil(Math.sqrt(n)), note: '— instant on any computer', className: 'text-yellow-400' },
    { label: 'RSA-512  (155 digits)', steps: '≈ 10^77', note: '— years on supercomputer', className: 'text-orange-400' },
    { label: 'RSA-2048 (617 digits)', steps: '≈ 10^308', note: '— longer than universe age', className: 'text-red-400' },
  ];
  return (
    <div className="rounded-lg border border-red-900/40 bg-red-950/20 p-4 space-y-2">
      <p className="text-xs font-mono text-red-400 font-bold">Classical trial division — steps needed</p>
      {rows.map((r, i) => (
        <div key={i} className="flex items-center justify-between text-xs font-mono gap-4">
          <span className={r.className}>{r.label}</span>
          <span className="text-gray-300">{typeof r.steps === 'number' ? r.steps.toLocaleString() : r.steps} steps {r.note}</span>
        </div>
      ))}
      <p className="text-xs text-gray-500 mt-1">
        Classical security relies on the fact that factoring is <em>astronomically</em> hard for large n.
        Shor's algorithm reduces this to polynomial time on a quantum computer.
      </p>
    </div>
  );
}

// ── Tier gate inline card ──────────────────────────────────────────────────────
function TierGate({
  tier, isAuthenticated, credits, onSignIn, onBuyCredits,
}: {
  tier: 'login' | 'paid';
  isAuthenticated: boolean;
  credits: number | null;
  onSignIn: () => void;
  onBuyCredits: () => void;
}) {
  if (tier === 'login' && !isAuthenticated) {
    return (
      <motion.div
        initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }}
        className="rounded-lg border border-yellow-500/40 bg-yellow-950/15 p-4 flex items-start gap-3"
      >
        <span className="text-xl mt-0.5">🔒</span>
        <div className="flex-1">
          <p className="font-mono font-bold text-yellow-400 text-sm">Login required</p>
          <p className="text-gray-400 text-xs mt-0.5">Sign in to unlock this preset — it's free.</p>
          <button
            onClick={onSignIn}
            className="mt-2 px-4 py-1.5 rounded border border-yellow-500/50 text-yellow-400 text-xs font-mono hover:bg-yellow-950/40 transition-colors"
          >
            Sign in with Google
          </button>
        </div>
      </motion.div>
    );
  }
  if (tier === 'paid') {
    if (!isAuthenticated) {
      return (
        <motion.div
          initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }}
          className="rounded-lg border border-quantum-purple/40 bg-purple-950/15 p-4 flex items-start gap-3"
        >
          <span className="text-xl mt-0.5">🔐</span>
          <div className="flex-1">
            <p className="font-mono font-bold text-quantum-purple text-sm">Login + 100 ⚛ credits required</p>
            <p className="text-gray-400 text-xs mt-0.5">Sign in first, then purchase credits to run this preset.</p>
            <button
              onClick={onSignIn}
              className="mt-2 px-4 py-1.5 rounded border border-quantum-purple/50 text-quantum-purple text-xs font-mono hover:bg-purple-950/40 transition-colors"
            >
              Sign in with Google
            </button>
          </div>
        </motion.div>
      );
    }
    if ((credits ?? 0) < 100) {
      return (
        <motion.div
          initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }}
          className="rounded-lg border border-quantum-purple/40 bg-purple-950/15 p-4 flex items-start gap-3"
        >
          <span className="text-xl mt-0.5">⚛</span>
          <div className="flex-1">
            <p className="font-mono font-bold text-quantum-purple text-sm">100 credits required</p>
            <p className="text-gray-400 text-xs mt-0.5">You have {credits ?? 0} credits. Top up to run the large preset.</p>
            <button
              onClick={onBuyCredits}
              className="mt-2 px-4 py-1.5 rounded border border-quantum-purple/50 text-quantum-purple text-xs font-mono hover:bg-purple-950/40 transition-colors"
            >
              Buy credits
            </button>
          </div>
        </motion.div>
      );
    }
  }
  return null;
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function RSAPage() {
  const { isAuthenticated, credits, accessToken, startStripeCheckout } = useAuth();

  // Scene 1: Keygen
  const [preset, setPreset] = useState(0);
  const [keygen, setKeygen] = useState<KeygenResponse | null>(null);
  const [keygenLoading, setKeygenLoading] = useState(false);

  // Scene 2: Encrypt/Decrypt
  const [msgInt, setMsgInt] = useState(7);
  const [encrypt, setEncrypt] = useState<EncryptResponse | null>(null);
  const [decrypt, setDecrypt] = useState<DecryptResponse | null>(null);
  const [encLoading, setEncLoading] = useState(false);
  const [msgSent, setMsgSent] = useState(false);

  // Scene 3: Eve
  const [classical, setClassical] = useState<ClassicalFactorResponse | null>(null);
  const [eveLoading, setEveLoading] = useState(false);
  const [eveAnimStep, setEveAnimStep] = useState(0);
  const eveTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  // Scene 4: Shor
  const [shor, setShor] = useState<ShorResponse | null>(null);
  const [shorLoading, setShorLoading] = useState(false);

  const selectedPreset = PRIME_PRESETS[preset];
  const presetLocked =
    (selectedPreset.tier === 'login' && !isAuthenticated) ||
    (selectedPreset.tier === 'paid' && (!isAuthenticated || (credits ?? 0) < 100));

  function handleSignIn() {
    supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.href },
    });
  }

  // ── Scene 1 handlers ────────────────────────────────────────────────────────
  async function handleKeygen() {
    const { p, q } = selectedPreset;
    setKeygenLoading(true);
    setKeygen(null);
    setEncrypt(null);
    setDecrypt(null);
    setClassical(null);
    setShor(null);
    setMsgSent(false);
    setEveAnimStep(0);
    setMsgInt(7);
    try {
      const res = await rsaApi.keygen(p, q, accessToken);
      setKeygen(res);
    } finally {
      setKeygenLoading(false);
    }
  }

  // ── Scene 2 handlers ────────────────────────────────────────────────────────
  async function handleEncryptDecrypt() {
    if (!keygen) return;
    const mi = msgInt;
    if (mi < 1 || mi >= keygen.n) { alert(`Message must be between 1 and ${keygen.n - 1}.`); return; }
    setEncLoading(true);
    setEncrypt(null);
    setDecrypt(null);
    setMsgSent(false);
    try {
      const enc = await rsaApi.encrypt(mi, keygen.e, keygen.n);
      setEncrypt(enc);
      await new Promise(r => setTimeout(r, 600)); // brief pause for animation
      setMsgSent(true);
      const dec = await rsaApi.decrypt(enc.ciphertext, keygen.d, keygen.n);
      setDecrypt(dec);
    } finally {
      setEncLoading(false);
    }
  }

  // ── Scene 3 handlers ────────────────────────────────────────────────────────
  async function handleEveAttack() {
    if (!keygen) return;
    setEveLoading(true);
    setClassical(null);
    setEveAnimStep(0);
    if (eveTimer.current) clearInterval(eveTimer.current);
    try {
      const res = await rsaApi.classicalFactor(keygen.n, 5000);
      setClassical(res);
      // animate through step_log
      let i = 0;
      eveTimer.current = setInterval(() => {
        i += 1;
        setEveAnimStep(i);
        if (i >= res.step_log.length) clearInterval(eveTimer.current!);
      }, 80);
    } finally {
      setEveLoading(false);
    }
  }

  // ── Scene 4 handlers ────────────────────────────────────────────────────────
  async function handleShor() {
    setShorLoading(true);
    setShor(null);
    try {
      const res = await rsaApi.shorFactor();
      setShor(res);
    } finally {
      setShorLoading(false);
    }
  }

  return (
    <div className="space-y-8 max-w-3xl">
      {/* ── Page header ──────────────────────────────────────────────────── */}
      <div>
        <h1 className="text-3xl font-bold font-mono text-quantum-cyan">
          🔐 RSA vs Shor's Algorithm
        </h1>
        <p className="text-gray-400 mt-1 text-sm">
          Watch Alice encrypt a secret, Eve fail to break it classically — then a quantum computer crack it in seconds.
        </p>
      </div>

      {/* ── Scene 1: RSA Key Generation ─────────────────────────────────── */}
      <SectionCard>
        <SectionHeader icon="🔑" title="Scene 1 — Alice Generates Keys" subtitle="RSA security comes from choosing two large prime numbers" />

        <div className="flex flex-wrap gap-3 mb-4">
          {PRIME_PRESETS.map((p, i) => {
            const isLocked =
              (p.tier === 'login' && !isAuthenticated) ||
              (p.tier === 'paid' && (!isAuthenticated || (credits ?? 0) < 100));
            return (
              <button
                key={i}
                onClick={() => setPreset(i)}
                className={`px-4 py-2 rounded-lg border text-sm font-mono transition-all relative ${
                  preset === i
                    ? 'border-quantum-cyan text-quantum-cyan bg-quantum-cyan/10'
                    : 'border-quantum-border text-gray-400 hover:border-gray-500'
                }`}
              >
                {isLocked && (
                  <span className="absolute -top-1.5 -right-1.5 text-[10px] bg-yellow-500 text-black rounded-full px-1 font-bold">
                    {p.tier === 'paid' ? '💳' : '🔒'}
                  </span>
                )}
                <div className="font-bold">{p.label}</div>
                <div className="text-xs opacity-70">{p.desc}</div>
              </button>
            );
          })}
        </div>

        {/* Tier gate — shown when the selected preset requires login or credits */}
        <AnimatePresence>
          {presetLocked && (
            <div className="mb-4">
              <TierGate
                tier={selectedPreset.tier as 'login' | 'paid'}
                isAuthenticated={isAuthenticated}
                credits={credits}
                onSignIn={handleSignIn}
                onBuyCredits={startStripeCheckout}
              />
            </div>
          )}
        </AnimatePresence>

        <div className="flex items-center gap-3 mb-4 text-sm font-mono text-gray-300">
          <span>p = <span className="text-quantum-cyan">{selectedPreset.p}</span></span>
          <span>×</span>
          <span>q = <span className="text-quantum-cyan">{selectedPreset.q}</span></span>
          <span>=</span>
          <span>n = <span className="text-white font-bold">{selectedPreset.p * selectedPreset.q}</span></span>
        </div>

        <button
          onClick={handleKeygen}
          disabled={keygenLoading || presetLocked}
          className="btn-cyan mb-4 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {keygenLoading ? 'Generating…' : '⚙️ Generate RSA Keys'}
        </button>

        {keygen && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
            <StepReveal steps={keygen.steps} />
            <div className="grid grid-cols-2 gap-3 mt-3">
              <div className="rounded-lg border border-quantum-cyan/30 bg-quantum-cyan/5 p-3 font-mono text-sm">
                <div className="text-quantum-cyan font-bold mb-1">📢 Public Key</div>
                <div className="text-white">e = {keygen.e}</div>
                <div className="text-white">n = {keygen.n}</div>
                <div className="text-xs text-gray-500 mt-1">Share freely — used to encrypt</div>
              </div>
              <div className="rounded-lg border border-quantum-purple/30 bg-quantum-purple/5 p-3 font-mono text-sm">
                <div className="text-quantum-purple font-bold mb-1">🔒 Private Key</div>
                <div className="text-white">d = {keygen.d}</div>
                <div className="text-white">n = {keygen.n}</div>
                <div className="text-xs text-gray-500 mt-1">Alice's secret — never shared</div>
              </div>
            </div>
          </motion.div>
        )}
      </SectionCard>

      {/* ── Scene 2: Alice encrypts, Bob decrypts ─────────────────────────── */}
      <AnimatePresence>
        {keygen && (
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
            <SectionCard>
              <SectionHeader icon="✉️" title="Scene 2 — Alice Sends a Secret Message" subtitle="Encryption: c = mᵉ mod n  |  Decryption: m = cᵈ mod n" />

              <div className="flex items-center gap-4 mb-4">
                <Actor name="Alice" color="border-quantum-cyan/50 text-quantum-cyan" emoji="👩" />
                <div className="flex-1 flex items-center gap-2 flex-wrap">
                  <label className="text-sm text-gray-400 font-mono">Message (integer):</label>
                  <input
                    type="number"
                    min={1}
                    max={keygen.n - 1}
                    value={msgInt}
                    onChange={e => setMsgInt(Math.max(1, Math.min(keygen.n - 1, parseInt(e.target.value) || 1)))}
                    className="w-20 text-center bg-quantum-dark border border-quantum-border rounded px-2 py-1 font-mono text-white text-lg"
                  />
                  <span className="text-xs text-gray-500 font-mono">
                    valid range: 1–{keygen.n - 1}
                    {msgInt >= 32 && msgInt <= 126 ? ` · ASCII "${String.fromCharCode(msgInt)}"` : ''}
                  </span>
                  {(msgInt < 1 || msgInt >= keygen.n) && (
                    <span className="text-xs text-red-400">⚠ must be between 1 and {keygen.n - 1}</span>
                  )}
                </div>
                <Actor name="Bob" color="border-green-500/50 text-green-400" emoji="👨" />
              </div>

              <button
                onClick={handleEncryptDecrypt}
                disabled={encLoading || msgInt < 1 || msgInt >= keygen.n}
                className="btn-cyan mb-5"
              >
                {encLoading ? 'Sending…' : '🚀 Encrypt & Send'}
              </button>

              {encrypt && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <p className="text-xs text-quantum-cyan font-mono font-bold">Alice encrypts:</p>
                      <StepReveal steps={encrypt.steps} color="text-quantum-cyan" />
                    </div>

                    {/* Flying envelope animation */}
                    <div className="flex flex-col items-center justify-center gap-2">
                      <AnimatePresence>
                        {msgSent && (
                          <motion.div
                            initial={{ x: -60, opacity: 0 }}
                            animate={{ x: 0, opacity: 1 }}
                            transition={{ type: 'spring', stiffness: 80 }}
                            className="text-center"
                          >
                            <div className="text-3xl mb-1">📨</div>
                            <div className="font-mono text-sm text-white border border-quantum-border rounded px-3 py-1">
                              ciphertext = <span className="text-quantum-cyan font-bold">{encrypt.ciphertext}</span>
                            </div>
                            <div className="text-xs text-gray-500 mt-1">Bob receives garbled data…</div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </div>

                  {decrypt && (
                    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
                      <p className="text-xs text-green-400 font-mono font-bold mb-1">Bob decrypts:</p>
                      <StepReveal steps={decrypt.steps} color="text-green-400" />
                      <div className="mt-3 text-center">
                        <span className="inline-block px-6 py-3 rounded-lg border border-green-500/40 bg-green-950/20 font-mono text-2xl text-green-300">
                          ✅ Bob reads: "{decrypt.plaintext_char}"
                        </span>
                      </div>
                    </motion.div>
                  )}
                </motion.div>
              )}
            </SectionCard>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Scene 3: Eve's classical attack ─────────────────────────────── */}
      <AnimatePresence>
        {keygen && encrypt && (
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
            <SectionCard>
              <SectionHeader icon="🕵️" title="Scene 3 — Eve Tries to Break It (Classically)" subtitle="Eve knows (e, n, ciphertext). To decrypt she must factor n = p × q." />

              <div className="flex items-center gap-4 mb-4">
                <Actor name="Eve" color="border-red-500/50 text-red-400" emoji="😈" />
                <div className="text-sm text-gray-400 font-mono">
                  Knows: e={keygen.e}, n={keygen.n}, ciphertext={encrypt.ciphertext}
                  <br />
                  Goal: find p and q to compute φ(n) and then d
                </div>
              </div>

              <button
                onClick={handleEveAttack}
                disabled={eveLoading}
                className="px-4 py-2 rounded-lg border border-red-500/50 text-red-400 hover:bg-red-950/30 text-sm font-mono transition-all mb-4"
              >
                {eveLoading ? 'Eve is trying…' : '⚔️ Eve Attacks! (Trial Division)'}
              </button>

              {classical && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
                  {/* Animated step log */}
                  <div>
                    <p className="text-xs text-gray-500 font-mono mb-2">Trying divisors: 2, 3, 4…</p>
                    <div className="h-20 overflow-hidden rounded-lg border border-quantum-border bg-quantum-dark p-2">
                      <div className="flex flex-wrap gap-1">
                        {classical.step_log.slice(0, eveAnimStep).map((step, i) => (
                          <motion.span
                            key={i}
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className={`font-mono text-xs px-1.5 py-0.5 rounded ${
                              step.is_factor
                                ? 'bg-red-500 text-white font-bold'
                                : 'bg-quantum-surface text-gray-500'
                            }`}
                          >
                            {step.divisor}
                          </motion.span>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Result */}
                  <div className={`rounded-lg border p-4 ${
                    classical.succeeded
                      ? 'border-red-500/40 bg-red-950/20'
                      : 'border-yellow-500/40 bg-yellow-950/20'
                  }`}>
                    {classical.succeeded ? (
                      <div className="font-mono text-sm space-y-1">
                        <div className="text-red-400 font-bold">😈 Eve found the factors!</div>
                        <div className="text-white">p = {classical.factors[0]},  q = {classical.factors[1]}</div>
                        <div className="text-gray-400">Took {classical.steps_taken} divisor checks out of {classical.total_steps_needed.toLocaleString()} needed</div>
                        <div className="text-gray-400">{classical.time_estimate}</div>
                        <div className="text-red-300 mt-2">
                          ⚠️ For n={keygen.n}, this was easy. But RSA uses n with hundreds of digits…
                        </div>
                      </div>
                    ) : (
                      <div className="font-mono text-sm space-y-1">
                        <div className="text-yellow-400 font-bold">Eve gave up after {classical.steps_taken} steps</div>
                        <div className="text-gray-400">{classical.time_estimate}</div>
                      </div>
                    )}
                  </div>

                  <ScaleComparison n={keygen.n} />
                </motion.div>
              )}
            </SectionCard>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Scene 4: Shor's Algorithm ─────────────────────────────────────── */}
      <AnimatePresence>
        {keygen && classical && (
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
            <SectionCard className="border-quantum-cyan/30">
              <SectionHeader icon="⚛" title="Scene 4 — Eve Gets a Quantum Computer" subtitle="Shor's algorithm finds the period of f(x) = aˣ mod n in polynomial time" />

              <div className="rounded-lg border border-quantum-cyan/20 bg-quantum-cyan/5 p-4 mb-4 text-sm text-gray-300 space-y-1">
                <p className="font-mono text-quantum-cyan font-bold">Demo: n = 15, a = 7 (fixed Qiskit circuit)</p>
                <p>4 counting qubits + 4 work qubits → QPE measures the phase of the quantum period-finding oracle.</p>
                <p>Continued fractions extracts the period r → gcd(a^(r/2) ± 1, n) gives the prime factors.</p>
              </div>

              <button
                onClick={handleShor}
                disabled={shorLoading}
                className="btn-cyan mb-5"
              >
                {shorLoading ? '⚛ Running QPE circuit (2048 shots)…' : '⚡ Run Shor\'s Algorithm'}
              </button>

              {shorLoading && (
                <div className="flex items-center gap-3 text-quantum-cyan font-mono text-sm">
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
                    className="w-5 h-5 border-2 border-quantum-cyan border-t-transparent rounded-full"
                  />
                  Simulating quantum circuit on AerSimulator…
                </div>
              )}

              {shor && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-5">
                  {/* Circuit stats */}
                  <div className="grid grid-cols-4 gap-3">
                    {[
                      { label: 'Qubits', value: shor.num_qubits },
                      { label: 'Circuit depth', value: shor.circuit_depth },
                      { label: 'Gates', value: shor.gate_count },
                      { label: 'Shots', value: shor.shots.toLocaleString() },
                    ].map(({ label, value }) => (
                      <div key={label} className="rounded-lg border border-quantum-border bg-quantum-dark p-3 text-center">
                        <div className="text-lg font-mono font-bold text-quantum-cyan">{value}</div>
                        <div className="text-xs text-gray-500">{label}</div>
                      </div>
                    ))}
                  </div>

                  {/* Measurement histogram */}
                  <MeasurementChart measurements={shor.measurements} shots={shor.shots} />

                  {/* Narrative steps */}
                  <div>
                    <p className="text-xs text-gray-500 font-mono mb-2">Algorithm steps:</p>
                    <StepReveal steps={shor.steps} color="text-quantum-cyan" />
                  </div>

                  {/* Success banner */}
                  {shor.succeeded && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="rounded-xl border-2 border-quantum-cyan bg-quantum-cyan/10 p-5 text-center"
                    >
                      <div className="text-4xl mb-2">🎉</div>
                      <div className="font-mono font-bold text-2xl text-quantum-cyan">
                        n = {shor.factors[0]} × {shor.factors[1]}
                      </div>
                      <div className="text-sm text-gray-300 mt-1">
                        Period r = {shor.period_r} found via QPE in {shor.shots.toLocaleString()} shots
                      </div>
                      <div className="text-xs text-gray-400 mt-3 max-w-md mx-auto">
                        With factors known, Eve computes φ(n) = {shor.factors[0] - 1} × {shor.factors[1] - 1} = {(shor.factors[0]-1)*(shor.factors[1]-1)}, then
                        d = e⁻¹ mod φ(n) — the private key is broken.
                      </div>
                    </motion.div>
                  )}

                  {/* Quantum vs classical comparison */}
                  <div className="rounded-lg border border-quantum-border bg-quantum-dark p-4 font-mono text-xs space-y-2">
                    <div className="text-gray-400 font-bold mb-2">Complexity comparison for factoring n</div>
                    <div className="flex justify-between">
                      <span className="text-red-400">Classical best (GNFS):</span>
                      <span className="text-gray-300">exp(O(n^(1/3) · log(n)^(2/3))) — superexponential</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-quantum-cyan">Shor's algorithm:</span>
                      <span className="text-gray-300">O((log n)³) — polynomial ⚡</span>
                    </div>
                    <div className="text-gray-500 mt-1">
                      A quantum computer with ~4000 logical qubits could factor RSA-2048 in hours.
                      This is why post-quantum cryptography (lattice-based, hash-based) is being standardized now.
                    </div>
                  </div>
                </motion.div>
              )}
            </SectionCard>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
