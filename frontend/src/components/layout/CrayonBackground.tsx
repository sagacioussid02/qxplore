/**
 * Subtle hand-drawn crayon doodles in the page background.
 * SVG paths animate via stroke-dashoffset to look like they're being drawn.
 * Filled at low opacity so they don't compete with foreground content.
 */
import { motion } from 'framer-motion';

const CRAYON_COLORS = ['#00ffff', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981'];

interface Doodle {
  d: string;          // SVG path
  color: string;
  strokeWidth: number;
  delay: number;
  duration: number;
}

// Hand-drawn-ish paths: superposition wave, qubit |0⟩, atom orbits, gate boxes, arrows
const DOODLES: Doodle[] = [
  // Top-left: wavy superposition
  { d: 'M 80 120 Q 130 80, 180 120 T 280 120 T 380 120',
    color: CRAYON_COLORS[0], strokeWidth: 2.5, delay: 0,    duration: 3 },
  // Top-right: ket symbol
  { d: 'M 1100 100 L 1100 200 L 1180 150 L 1100 200',
    color: CRAYON_COLORS[1], strokeWidth: 2.5, delay: 1.2,  duration: 2 },
  // Mid-left: spiral / orbit
  { d: 'M 60 500 q 40 -60 90 -20 q 60 50 -10 100 q -80 60 -60 -50 q 20 -100 100 -50',
    color: CRAYON_COLORS[2], strokeWidth: 2,   delay: 2.0,  duration: 4 },
  // Mid-right: H gate box with squiggle
  { d: 'M 1080 480 L 1080 580 L 1180 580 L 1180 480 Z M 1100 530 L 1160 530',
    color: CRAYON_COLORS[3], strokeWidth: 2.5, delay: 0.8,  duration: 2.5 },
  // Bottom-left: arrow
  { d: 'M 100 900 Q 200 850, 300 920 L 280 905 M 300 920 L 285 940',
    color: CRAYON_COLORS[4], strokeWidth: 2,   delay: 3.0,  duration: 2.5 },
  // Bottom-right: zigzag / measurement
  { d: 'M 1050 880 L 1100 920 L 1080 950 L 1140 920 L 1180 970',
    color: CRAYON_COLORS[0], strokeWidth: 2.5, delay: 1.8,  duration: 2 },
  // Middle: dotted path / qubit thread
  { d: 'M 400 600 Q 600 520, 800 600 Q 900 660, 1000 580',
    color: CRAYON_COLORS[1], strokeWidth: 1.8, delay: 2.5,  duration: 4 },
  // Top-mid: small atom
  { d: 'M 600 80 a 40 18 0 1 0 0.1 0 M 600 80 a 18 40 0 1 0 0.1 0',
    color: CRAYON_COLORS[2], strokeWidth: 1.8, delay: 0.3,  duration: 3 },
];

export function CrayonBackground() {
  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 z-0 overflow-hidden"
      style={{ opacity: 0.18 }}
    >
      <svg
        width="100%"
        height="100%"
        viewBox="0 0 1280 1024"
        preserveAspectRatio="xMidYMid slice"
        xmlns="http://www.w3.org/2000/svg"
        style={{ filter: 'url(#crayon-rough)' }}
      >
        {/* Crayon-texture filter: turbulence + displacement makes lines look hand-drawn */}
        <defs>
          <filter id="crayon-rough" x="-10%" y="-10%" width="120%" height="120%">
            <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="3" />
            <feDisplacementMap in="SourceGraphic" scale="1.5" />
          </filter>
        </defs>

        {DOODLES.map((doodle, i) => (
          <motion.path
            key={i}
            d={doodle.d}
            stroke={doodle.color}
            strokeWidth={doodle.strokeWidth}
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
            initial={{ pathLength: 0, opacity: 0 }}
            animate={{ pathLength: 1, opacity: 1 }}
            transition={{
              pathLength: { duration: doodle.duration, delay: doodle.delay, ease: 'easeInOut' },
              opacity:    { duration: 0.4,            delay: doodle.delay },
            }}
          />
        ))}
      </svg>
    </div>
  );
}
