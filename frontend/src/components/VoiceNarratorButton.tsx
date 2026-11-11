import { useState } from 'react';
import { TTS_ENABLED } from '../featureFlags';
import { Volume2, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface VoiceNarratorButtonProps {
  className?: string;
  compact?: boolean;
}

export function VoiceNarratorButton({ className = "", compact = false }: VoiceNarratorButtonProps) {
  if (!TTS_ENABLED) return null;
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div
      className="relative inline-flex items-center"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <button
        type="button"
        disabled
        aria-label="AI Voice Narrator (Coming Soon)"
        className={`group relative flex items-center gap-2 px-3 py-2 rounded-xl bg-white/95 dark:bg-slate-800/95 border border-slate-200/90 dark:border-slate-700/80 text-slate-800 dark:text-slate-200 text-xs font-semibold shadow-xs transition-all duration-200 cursor-not-allowed hover:border-indigo-400/70 dark:hover:border-sky-400/70 min-h-[44px] ${className}`}
      >
        <span className="relative flex items-center justify-center size-5 rounded-lg bg-indigo-50 dark:bg-sky-950/60 text-indigo-600 dark:text-sky-400 transition-colors shrink-0">
          <Volume2 className="size-3.5 transition-transform duration-200 group-hover:scale-110" />
        </span>
        {!compact && <span>AI Voice Narrator</span>}
        <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950/70 text-amber-700 dark:text-amber-300 border border-amber-300/60 dark:border-amber-800/60 shrink-0">
          Soon
        </span>
      </button>

      {/* Tactile Popover Tooltip on Hover */}
      <AnimatePresence>
        {isHovered && (
          <motion.div
            initial={{ opacity: 0, y: 6, scale: 0.94 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 4, scale: 0.94 }}
            transition={{ type: "spring", stiffness: 450, damping: 28 }}
            className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-50 pointer-events-none whitespace-nowrap"
          >
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-950 text-white text-[11px] font-medium shadow-2xl border border-slate-700/80 backdrop-blur-md">
              <Sparkles className="size-3.5 text-amber-400 shrink-0 animate-pulse" />
              <span>AI Neural Voice Narrator &bull; <strong className="text-amber-300 font-semibold">Coming Soon</strong></span>
              <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 border-4 border-transparent border-t-slate-950" />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default VoiceNarratorButton;
