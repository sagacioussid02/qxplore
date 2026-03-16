import { motion, AnimatePresence } from 'framer-motion';

interface QuantumCoinVisualProps {
  phase: 'idle' | 'flipping' | 'revealing' | 'done';
  result: number | null; // 0 = heads, 1 = tails
}

export function QuantumCoinVisual({ phase, result }: QuantumCoinVisualProps) {
  const isFlipping = phase === 'flipping';
  const revealed = phase === 'revealing' || phase === 'done';

  return (
    <div className="flex flex-col items-center gap-6">
      {/* Coin */}
      <div className="relative" style={{ width: 160, height: 160 }}>
        <motion.div
          animate={
            isFlipping
              ? { rotateY: [0, 360, 720, 1080], scale: [1, 1.1, 1] }
              : revealed
              ? { rotateY: 0, scale: 1 }
              : { rotateY: 0, y: [0, -8, 0] }
          }
          transition={
            isFlipping
              ? { duration: 1.8, ease: 'easeInOut' }
              : revealed
              ? { duration: 0.4 }
              : { duration: 2, repeat: Infinity, ease: 'easeInOut' }
          }
          style={{ width: 160, height: 160 }}
        >
          <svg viewBox="0 0 160 160" width="160" height="160">
            {/* Outer glow ring */}
            <circle
              cx="80"
              cy="80"
              r="75"
              fill="none"
              stroke={revealed ? (result === 0 ? '#00ffff' : '#8b5cf6') : '#1e2d4a'}
              strokeWidth="3"
              opacity={isFlipping ? 0.3 : 0.8}
              style={{ filter: `blur(${isFlipping ? 4 : 0}px)` }}
            />
            {/* Coin body */}
            <circle
              cx="80"
              cy="80"
              r="68"
              fill={
                isFlipping
                  ? '#131929'
                  : revealed
                  ? result === 0
                    ? '#0a2030'
                    : '#1a0a30'
                  : '#131929'
              }
              stroke={
                isFlipping
                  ? '#00ffff'
                  : revealed
                  ? result === 0
                    ? '#00ffff'
                    : '#8b5cf6'
                  : '#1e2d4a'
              }
              strokeWidth="2"
            />
            {/* Inner symbol */}
            {!isFlipping && !revealed && (
              <text
                x="80"
                y="92"
                textAnchor="middle"
                fill="#1e2d4a"
                fontSize="52"
                fontFamily="monospace"
                fontWeight="bold"
              >
                ⚛
              </text>
            )}
            {isFlipping && (
              <text
                x="80"
                y="100"
                textAnchor="middle"
                fill="#00ffff"
                fontSize="40"
                fontFamily="monospace"
                opacity="0.6"
              >
                ?
              </text>
            )}
            {revealed && (
              <>
                <text
                  x="80"
                  y="88"
                  textAnchor="middle"
                  fill={result === 0 ? '#00ffff' : '#8b5cf6'}
                  fontSize="36"
                  fontFamily="monospace"
                  fontWeight="bold"
                >
                  {result === 0 ? '|0⟩' : '|1⟩'}
                </text>
                <text
                  x="80"
                  y="115"
                  textAnchor="middle"
                  fill={result === 0 ? '#00ffff' : '#8b5cf6'}
                  fontSize="13"
                  fontFamily="monospace"
                  opacity="0.7"
                >
                  {result === 0 ? 'HEADS' : 'TAILS'}
                </text>
              </>
            )}
          </svg>
        </motion.div>

        {/* Spinning blur ring during flip */}
        <AnimatePresence>
          {isFlipping && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1, rotate: 360 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.6, repeat: Infinity, ease: 'linear' }}
              className="absolute inset-0 rounded-full"
              style={{
                border: '2px solid transparent',
                borderTopColor: '#00ffff',
                borderRightColor: '#8b5cf6',
                boxShadow: '0 0 30px rgba(0,255,255,0.4)',
              }}
            />
          )}
        </AnimatePresence>
      </div>

      {/* State label */}
      <div className="text-center">
        {phase === 'idle' && (
          <p className="font-mono text-quantum-cyan text-sm animate-pulse-glow">
            State: <span className="font-bold">Superposition</span>
          </p>
        )}
        {isFlipping && (
          <p className="font-mono text-quantum-cyan text-sm animate-pulse">
            Applying H gate... measuring...
          </p>
        )}
        {revealed && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            className="space-y-1"
          >
            <p className="font-mono text-xl font-bold" style={{ color: result === 0 ? '#00ffff' : '#8b5cf6' }}>
              {result === 0 ? 'HEADS — |0⟩' : 'TAILS — |1⟩'}
            </p>
            <p className="text-gray-400 text-sm">Wave function collapsed!</p>
          </motion.div>
        )}
      </div>
    </div>
  );
}
