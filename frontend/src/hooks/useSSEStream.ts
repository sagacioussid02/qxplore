import { useEffect, useRef, useCallback } from 'react';
import type { StreamChunk } from '../types/agents';

interface SSEStreamOptions {
  onChunk: (chunk: string) => void;
  onDone?: () => void;
  onError?: (err: Event) => void;
}

/**
 * Opens an SSE connection to `url` and calls onChunk for each streamed token.
 * Buffers chunks in a ref and flushes to avoid excessive re-renders.
 */
export function useSSEStream(url: string | null, options: SSEStreamOptions) {
  const { onChunk, onDone, onError } = options;
  const bufferRef = useRef('');
  const rafRef = useRef<number>(0);
  const esRef = useRef<EventSource | null>(null);

  const flush = useCallback(() => {
    if (bufferRef.current) {
      onChunk(bufferRef.current);
      bufferRef.current = '';
    }
  }, [onChunk]);

  useEffect(() => {
    if (!url) return;

    const es = new EventSource(url);
    esRef.current = es;

    es.onmessage = (e) => {
      const data = JSON.parse(e.data) as StreamChunk;
      if (data.done) {
        flush();
        es.close();
        onDone?.();
        return;
      }
      bufferRef.current += data.chunk;
      cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(flush);
    };

    es.onerror = (e) => {
      es.close();
      onError?.(e);
    };

    return () => {
      cancelAnimationFrame(rafRef.current);
      es.close();
    };
  }, [url]);
}
