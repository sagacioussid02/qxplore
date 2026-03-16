import { useAgentStore } from '../../store/agentStore';

export function TutorPanel() {
  const { tutorText, isTutorStreaming } = useAgentStore();

  if (!tutorText && !isTutorStreaming) return null;

  return (
    <div className="card-quantum p-4 border-l-2 border-quantum-cyan">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-quantum-cyan text-sm font-mono font-semibold">⚛ Quantum Tutor</span>
        {isTutorStreaming && (
          <span className="text-xs text-quantum-cyan animate-pulse">thinking...</span>
        )}
      </div>
      <p className="text-gray-300 text-sm leading-relaxed">
        {tutorText}
        {isTutorStreaming && <span className="animate-pulse text-quantum-cyan ml-0.5">▋</span>}
      </p>
    </div>
  );
}
