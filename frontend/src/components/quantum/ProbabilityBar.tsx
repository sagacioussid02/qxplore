interface ProbabilityBarProps {
  probabilities: Record<string, number>;
  labels?: Record<string, string>;
  highlight?: string;
}

const COLORS: Record<string, string> = {
  '0': '#00ffff',
  '1': '#8b5cf6',
  default: '#ec4899',
};

export function ProbabilityBar({ probabilities, labels, highlight }: ProbabilityBarProps) {
  const entries = Object.entries(probabilities).sort(([a], [b]) => a.localeCompare(b));

  return (
    <div className="card-quantum p-4 space-y-3">
      <p className="text-xs text-gray-500 font-mono">Probabilities</p>
      {entries.map(([key, prob]) => {
        const pct = Math.round(prob * 100);
        const color = COLORS[key] ?? COLORS.default;
        const isHighlighted = highlight === key;
        return (
          <div key={key}>
            <div className="flex justify-between mb-1">
              <span className="text-sm font-mono" style={{ color }}>
                |{key}⟩ {labels?.[key] ? `— ${labels[key]}` : ''}
                {isHighlighted && ' ◄'}
              </span>
              <span className="text-sm font-mono text-white">{pct}%</span>
            </div>
            <div className="h-2 bg-quantum-border rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-700"
                style={{ width: `${pct}%`, backgroundColor: color, boxShadow: `0 0 8px ${color}` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
