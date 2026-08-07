import React from 'react';
import { Lightbulb } from 'lucide-react';

export const QuickTipsCard: React.FC = () => {
  return (
    <div className="bg-white rounded-[22px] border border-slate-200/80 p-4 shadow-sm space-y-2 select-none">
      <h3 className="font-extrabold text-sm text-[#111827] flex items-center gap-1.5">
        <Lightbulb className="w-4 h-4 text-amber-500" />
        Fermerlar uchun Maslahatlar
      </h3>
      <p className="text-xs text-slate-600 leading-relaxed">
        E'loningizga sifatli video va mahsulot sertifikatini biriktirish xaridorlar ishonchini 85% ga oshiradi.
      </p>
    </div>
  );
};
