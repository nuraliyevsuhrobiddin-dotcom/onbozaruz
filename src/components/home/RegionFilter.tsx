import React from 'react';
import { motion } from 'framer-motion';
import { MapPin } from 'lucide-react';
import { REGIONS } from '../../data/mockAgroData';

interface RegionFilterProps {
  selectedRegion: string;
  onSelectRegion: (reg: string) => void;
}

export const RegionFilter: React.FC<RegionFilterProps> = ({
  selectedRegion,
  onSelectRegion,
}) => {
  return (
    <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
      <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider shrink-0 mr-1 flex items-center gap-1">
        <MapPin className="w-3.5 h-3.5 text-[#E53935]" />
        Hudud:
      </span>
      {REGIONS.map((reg) => {
        const isRegSelected =
          (reg === 'Barchasi' && selectedRegion === 'all') || selectedRegion === reg;
        return (
          <motion.button
            key={reg}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => onSelectRegion(reg === 'Barchasi' ? 'all' : reg)}
            className={`px-3 py-1.5 rounded-full text-[11px] font-bold transition-all shrink-0 border ${
              isRegSelected
                ? 'bg-[#111827] text-white border-[#111827] shadow-sm'
                : 'bg-white text-slate-600 border-slate-200/80 hover:bg-slate-100'
            }`}
          >
            {reg}
          </motion.button>
        );
      })}
    </div>
  );
};
