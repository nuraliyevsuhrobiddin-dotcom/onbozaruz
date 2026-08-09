import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { WifiOff, RefreshCw } from 'lucide-react';

interface OfflineBannerProps {
  isVisible: boolean;
  onRetry: () => void;
  isRefreshing?: boolean;
  message?: string;
}

export const OfflineBanner: React.FC<OfflineBannerProps> = ({
  isVisible,
  onRetry,
  isRefreshing = false,
  message = "Offline rejim — saqlangan e'lonlar ko'rsatilmoqda",
}) => {
  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.2 }}
          className="w-full bg-amber-500/90 text-white px-3.5 py-2 text-xs font-bold flex items-center justify-between shadow-md z-40 rounded-xl mb-3 border border-amber-600/40"
        >
          <div className="flex items-center gap-2 min-w-0">
            <WifiOff className="w-4 h-4 shrink-0 text-amber-100" />
            <span className="truncate text-[11px] sm:text-xs">{message}</span>
          </div>

          <button
            type="button"
            onClick={onRetry}
            disabled={isRefreshing}
            className="shrink-0 ml-2 px-2.5 py-1 bg-white/20 hover:bg-white/30 rounded-lg text-[11px] font-black flex items-center gap-1 transition-colors active:scale-95 disabled:opacity-50"
          >
            <RefreshCw className={`w-3 h-3 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span>Qayta urinish</span>
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
