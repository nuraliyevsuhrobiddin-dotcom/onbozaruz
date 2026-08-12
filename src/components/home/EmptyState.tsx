import React from 'react';
import { motion } from 'framer-motion';
import { WifiOff, RefreshCw, SearchX } from 'lucide-react';

interface EmptyStateProps {
  onReset: () => void;
  /** True when posts are empty due to network/server error (not truly 0 posts) */
  isNetworkError?: boolean;
  /** Called when user clicks retry after a network error */
  onRetry?: () => void;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  onReset,
  isNetworkError = false,
  onRetry,
}) => {
  if (isNetworkError) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="py-14 flex flex-col items-center gap-3 text-slate-400 bg-white rounded-[22px] border border-amber-200 p-8 shadow-sm text-center select-none"
      >
        <div className="w-16 h-16 rounded-[20px] bg-amber-50 flex items-center justify-center mb-1 shadow-sm ring-1 ring-amber-100">
          <WifiOff className="w-8 h-8 text-amber-500" />
        </div>
        <h3 className="text-base font-black text-[#111827]">
          Internet bilan aloqa yo'q
        </h3>
        <p className="text-xs text-slate-400 max-w-xs leading-relaxed font-medium">
          Tarmoq xatosi yuz berdi. Internet ulanishingizni tekshiring va qayta urinib ko'ring.
        </p>
        {onRetry && (
          <button
            onClick={onRetry}
            className="flex items-center gap-2 px-6 py-3 rounded-full bg-amber-500 text-white text-xs font-extrabold hover:bg-amber-600 transition-colors mt-2 shadow-md"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Qayta urinish
          </button>
        )}
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="py-14 flex flex-col items-center gap-3 text-slate-400 bg-white rounded-[22px] border border-slate-200/80 p-8 shadow-sm text-center select-none"
    >
      <div className="w-16 h-16 rounded-[20px] bg-slate-50 flex items-center justify-center mb-1 shadow-sm ring-1 ring-slate-200/80">
        <SearchX className="w-8 h-8 text-slate-400" />
      </div>
      <h3 className="text-base font-black text-[#111827]">
        Ushbu mezonlar bo'yicha e'lon topilmadi
      </h3>
      <p className="text-xs text-slate-400 max-w-xs leading-relaxed font-medium">
        Keyinroq qaytadan urinib ko'ring yoki yangi e'lon joylang.
      </p>
      <button
        onClick={onReset}
        className="px-6 py-3 rounded-full bg-[#111827] text-white text-xs font-extrabold hover:bg-[#E53935] transition-colors mt-2 shadow-md"
      >
        Filtrlarni tozalash
      </button>
    </motion.div>
  );
};
