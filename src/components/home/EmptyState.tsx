import React from 'react';
import { motion } from 'framer-motion';

interface EmptyStateProps {
  onReset: () => void;
}

export const EmptyState: React.FC<EmptyStateProps> = ({ onReset }) => {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="py-14 flex flex-col items-center gap-3 text-slate-400 bg-white rounded-[22px] border border-slate-200/80 p-8 shadow-sm text-center select-none"
    >
      <img
        src="/logo.png"
        alt="OnBozor"
        className="w-16 h-16 rounded-[20px] object-cover shadow-sm ring-1 ring-slate-200/80 mb-1"
      />
      <h3 className="text-base font-black text-[#111827]">
        Ushbu mezonlar bo'yicha agro e'lon topilmadi
      </h3>
      <p className="text-xs text-slate-400 max-w-xs leading-relaxed font-medium">
        Kategoriyani yoki hudud filtrini o'zgartirib qaytadan urinib ko'ring.
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
