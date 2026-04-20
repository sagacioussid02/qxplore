interface Props {
  quantum: string;
  classical: string;
}

export function ComplexityBadge({ quantum, classical }: Props) {
  return (
    <div className="flex items-center gap-3 justify-center flex-wrap">
      <div className="text-center px-4 py-2 rounded-xl border"
        style={{ borderColor: '#00ffff40', background: 'rgba(0,255,255,0.08)' }}>
        <p className="text-xs text-gray-500 font-mono">Quantum</p>
        <p className="text-lg font-mono font-bold text-quantum-cyan">{quantum}</p>
      </div>
      <span className="text-gray-600 font-mono text-sm">vs</span>
      <div className="text-center px-4 py-2 rounded-xl border"
        style={{ borderColor: '#8b5cf640', background: 'rgba(139,92,246,0.08)' }}>
        <p className="text-xs text-gray-500 font-mono">Classical</p>
        <p className="text-lg font-mono font-bold text-quantum-purple">{classical}</p>
      </div>
    </div>
  );
}
