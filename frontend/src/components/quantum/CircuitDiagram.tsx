interface CircuitDiagramProps {
  gates?: string[];
  label?: string;
}

export function CircuitDiagram({ gates = ['H'], label = '|0⟩' }: CircuitDiagramProps) {
  const W = 60;
  const gateWidth = 48;
  const wireY = 40;
  const totalW = 80 + gates.length * (gateWidth + 20) + 80;

  return (
    <div className="card-quantum p-4">
      <p className="text-xs text-gray-500 font-mono mb-2">Quantum Circuit</p>
      <svg
        viewBox={`0 0 ${totalW} 80`}
        className="w-full max-w-xs"
        style={{ height: 80 }}
      >
        {/* Input label */}
        <text x="8" y={wireY + 5} fill="#00ffff" fontFamily="monospace" fontSize="14">
          {label}
        </text>

        {/* Main wire */}
        <line
          x1={W - 10}
          y1={wireY}
          x2={totalW - 30}
          y2={wireY}
          stroke="#1e2d4a"
          strokeWidth="2"
        />

        {/* Gates */}
        {gates.map((gate, i) => {
          const x = W + i * (gateWidth + 20);
          return (
            <g key={i}>
              <rect
                x={x}
                y={wireY - 16}
                width={gateWidth}
                height={32}
                rx="4"
                fill="#131929"
                stroke="#8b5cf6"
                strokeWidth="1.5"
              />
              <text
                x={x + gateWidth / 2}
                y={wireY + 5}
                textAnchor="middle"
                fill="#8b5cf6"
                fontFamily="monospace"
                fontSize="14"
                fontWeight="bold"
              >
                {gate}
              </text>
            </g>
          );
        })}

        {/* Measurement symbol */}
        <g transform={`translate(${totalW - 56}, ${wireY - 16})`}>
          <rect width="42" height="32" rx="4" fill="#131929" stroke="#00ffff" strokeWidth="1.5" />
          {/* Meter arc */}
          <path
            d="M 8 22 Q 21 6 34 22"
            fill="none"
            stroke="#00ffff"
            strokeWidth="1.5"
          />
          <line x1="21" y1="22" x2="34" y2="10" stroke="#00ffff" strokeWidth="1.5" />
        </g>
      </svg>
    </div>
  );
}
