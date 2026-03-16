import { motion, AnimatePresence } from 'framer-motion';
import { useAgentStore } from '../../store/agentStore';

export function GameMasterBanner() {
  const { gameMasterText, isGameMasterStreaming } = useAgentStore();

  return (
    <AnimatePresence>
      {(gameMasterText || isGameMasterStreaming) && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          className="card-quantum p-4 border border-quantum-purple bg-quantum-surface/80 backdrop-blur"
          style={{ boxShadow: '0 0 30px rgba(139,92,246,0.2)' }}
        >
          <div className="flex items-center gap-2 mb-1">
            <span className="text-quantum-purple text-sm font-mono font-semibold">
              🎭 Game Master
            </span>
            {isGameMasterStreaming && (
              <span className="text-xs text-quantum-purple animate-pulse">speaking...</span>
            )}
          </div>
          <p className="text-white text-base font-medium italic">
            {gameMasterText}
            {isGameMasterStreaming && (
              <span className="animate-pulse text-quantum-purple ml-0.5">▋</span>
            )}
          </p>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
