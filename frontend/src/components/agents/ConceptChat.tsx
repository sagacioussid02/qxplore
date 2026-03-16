import { useState, useRef, useEffect } from 'react';
import { useAgentStore } from '../../store/agentStore';
import { agentApi } from '../../api/agentApi';

export function ConceptChat() {
  const [input, setInput] = useState('');
  const [sessionId] = useState(() => Math.random().toString(36).slice(2));
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const {
    conceptHistory,
    isConceptStreaming,
    pushConceptMessage,
    appendConceptChunk,
    setConceptStreaming,
  } = useAgentStore();

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [conceptHistory]);

  const send = async () => {
    if (!input.trim() || isConceptStreaming) return;
    const message = input.trim();
    setInput('');

    pushConceptMessage({ role: 'user', content: message });
    setConceptStreaming(true);

    const url = agentApi.conceptQAStreamUrl(sessionId, message, conceptHistory);
    const es = new EventSource(url);
    es.onmessage = (e) => {
      const data = JSON.parse(e.data);
      if (data.done) {
        es.close();
        setConceptStreaming(false);
        return;
      }
      appendConceptChunk(data.chunk);
    };
    es.onerror = () => {
      es.close();
      setConceptStreaming(false);
    };
  };

  return (
    <div className="card-quantum flex flex-col h-[600px]">
      <div className="flex items-center gap-2 p-3 border-b border-quantum-border">
        <span className="text-quantum-cyan text-lg">⚛</span>
        <span className="font-mono text-sm font-semibold text-quantum-cyan">Quantum Tutor</span>
        <span className="text-xs text-gray-500 ml-auto">Ask anything</span>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {conceptHistory.length === 0 && (
          <div className="text-gray-500 text-sm text-center mt-8">
            <p>Ask me anything about</p>
            <p className="text-quantum-cyan font-mono">superposition · entanglement</p>
            <p className="text-quantum-cyan font-mono">measurement · interference</p>
          </div>
        )}
        {conceptHistory.map((msg, i) => (
          <div
            key={i}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[85%] px-3 py-2 rounded-lg text-sm ${
                msg.role === 'user'
                  ? 'bg-quantum-purple text-white'
                  : 'bg-quantum-surface text-gray-200 border border-quantum-border'
              }`}
            >
              {msg.content}
              {i === conceptHistory.length - 1 && isConceptStreaming && msg.role === 'assistant' && (
                <span className="animate-pulse text-quantum-cyan ml-0.5">▋</span>
              )}
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      <div className="p-3 border-t border-quantum-border flex gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && send()}
          placeholder="What is superposition?"
          className="flex-1 bg-quantum-navy border border-quantum-border rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-quantum-cyan"
        />
        <button
          onClick={send}
          disabled={isConceptStreaming}
          className="btn-cyan text-sm px-4 py-2 disabled:opacity-50"
        >
          →
        </button>
      </div>
    </div>
  );
}
