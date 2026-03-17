/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        quantum: {
          navy:    '#0f172a',
          dark:    '#141f33',
          surface: '#1a2540',
          border:  '#2a3d5c',
          cyan:    '#00ffff',
          purple:  '#8b5cf6',
          pink:    '#ec4899',
          green:   '#10b981',
          amber:   '#f59e0b',
          red:     '#ef4444',
        },
      },
      fontFamily: {
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
        sans: ['Inter', 'sans-serif'],
      },
      boxShadow: {
        cyan:        '0 0 20px rgba(0, 255, 255, 0.3)',
        purple:      '0 0 20px rgba(139, 92, 246, 0.3)',
        pink:        '0 0 20px rgba(236, 72, 153, 0.3)',
        'cyan-lg':   '0 0 40px rgba(0, 255, 255, 0.4)',
        'purple-lg': '0 0 40px rgba(139, 92, 246, 0.4)',
      },
      animation: {
        'spin-slow':   'spin 3s linear infinite',
        'pulse-glow':  'pulseGlow 2s ease-in-out infinite',
        'float':       'float 3s ease-in-out infinite',
      },
      keyframes: {
        pulseGlow: {
          '0%, 100%': { opacity: '1',   filter: 'brightness(1)' },
          '50%':      { opacity: '0.7', filter: 'brightness(1.4)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%':      { transform: 'translateY(-10px)' },
        },
      },
    },
  },
  plugins: [],
}

