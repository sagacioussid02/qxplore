import { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';

interface Props {
  text: string;
  done: boolean;
  phase: string;
}

/** Minimal markdown-to-HTML: bold, italic, headings, newlines. No dep needed. */
function SimpleMarkdown({ text }: { text: string }) {
  const lines = text.split('\n');
  return (
    <div className="space-y-1">
      {lines.map((line, i) => {
        if (line.startsWith('## '))
          return <h2 key={i} className="text-yellow-300 font-bold text-base mt-3">{line.slice(3)}</h2>;
        if (line.startsWith('### '))
          return <h3 key={i} className="text-yellow-200 font-semibold text-sm mt-2">{line.slice(4)}</h3>;
        if (line.startsWith('**') && line.endsWith('**'))
          return <p key={i} className="font-bold text-white">{line.slice(2, -2)}</p>;
        if (line.trim() === '')
          return <div key={i} className="h-1" />;
        // Inline bold
        const parts = line.split(/(\*\*.*?\*\*)/g);
        return (
          <p key={i} className="text-gray-300 text-sm leading-relaxed">
            {parts.map((p, j) =>
              p.startsWith('**') && p.endsWith('**')
                ? <strong key={j} className="text-white">{p.slice(2, -2)}</strong>
                : p
            )}
          </p>
        );
      })}
    </div>
  );
}

export function CommissionerPanel({ text, done, phase }: Props) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!done) bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [text, done]);

  if (phase !== 'evaluating' && phase !== 'done') return null;

  return (
    <motion.div
      className="rounded-xl border border-yellow-500/30 bg-gray-900/80 overflow-hidden"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <div className="flex items-center gap-2 px-4 py-3 border-b border-yellow-500/20 bg-yellow-500/5">
        <span className="text-lg">🎙️</span>
        <span className="text-yellow-400 font-semibold text-sm">Commissioner's Analysis</span>
        {!done && (
          <motion.span
            className="ml-auto text-xs text-yellow-600"
            animate={{ opacity: [1, 0.4, 1] }}
            transition={{ repeat: Infinity, duration: 1.2 }}
          >
            streaming…
          </motion.span>
        )}
        {done && <span className="ml-auto text-xs text-green-500">✓ Complete</span>}
      </div>
      <div className="px-4 py-3 max-h-96 overflow-y-auto">
        <SimpleMarkdown text={text} />
        {!done && <span className="inline-block w-1.5 h-4 bg-yellow-400 ml-0.5 animate-pulse" />}
        <div ref={bottomRef} />
      </div>
    </motion.div>
  );
}
