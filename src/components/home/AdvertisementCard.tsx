import React from 'react';
import { ExternalLink } from 'lucide-react';

export const AdvertisementCard: React.FC = () => {
  return (
    <div className="rounded-[22px] bg-gradient-to-br from-slate-900 via-[#111827] to-slate-950 text-white p-4 space-y-2.5 border border-slate-800 shadow-md select-none">
      <div className="inline-block px-2.5 py-0.5 rounded bg-[#E53935] text-[10px] font-black tracking-wider uppercase">
        REKLAMA
      </div>
      <h4 className="font-black text-sm text-white leading-tight">
        Agro-Lizing va Kam Foizli Imtiyozli Kreditlar
      </h4>
      <p className="text-[11px] text-slate-300 leading-relaxed">
        Qishloq xo'jaligi texnikalarini imtiyozli shartlar bilan xarid qiling.
      </p>
      <button className="w-full mt-1 py-2.5 rounded-[16px] bg-white text-[#111827] font-extrabold text-xs flex items-center justify-center gap-1.5 hover:bg-slate-100 transition-colors shadow-sm">
        <span>Batafsil ma'lumot</span>
        <ExternalLink className="w-3.5 h-3.5" />
      </button>
    </div>
  );
};
