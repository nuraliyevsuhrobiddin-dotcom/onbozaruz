import React, { useEffect, useState } from 'react';
import { ArrowLeft, Search, CheckCircle2, Loader2 } from 'lucide-react';
import { useAgroStore } from '../../store/useAgroStore';
import { b2bRepository } from '../../api/b2bRepository';
import { SupplierProfile } from '../../api/types';

const SUPPLIER_TYPE_LABEL: Record<string, string> = {
  manufacturer: 'Ishlab chiqaruvchi',
  importer: 'Importyor',
  distributor: 'Distributor',
  supplier: 'Yetkazib beruvchi',
};

export const B2BSuppliersListView: React.FC = () => {
  const { setB2BRoute } = useAgroStore();
  const [search, setSearch] = useState('');
  const [suppliers, setSuppliers] = useState<SupplierProfile[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    const t = window.setTimeout(() => {
      b2bRepository.listVerifiedSuppliers(search).then((list) => {
        if (!cancelled) { setSuppliers(list); setIsLoading(false); }
      });
    }, 300);
    return () => { cancelled = true; window.clearTimeout(t); };
  }, [search]);

  return (
    <div className="w-full max-w-170 mx-auto py-3 px-3 space-y-3 select-none pb-20">
      <div className="flex items-center gap-3">
        <button onClick={() => setB2BRoute({ view: 'home' })} className="p-2 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="font-black text-lg text-[#111827]">Ishlab chiqaruvchilar</h1>
      </div>

      <div className="relative">
        <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Kompaniya nomi bo'yicha qidirish"
          className="w-full bg-slate-100 rounded-2xl pl-10 pr-4 py-3 text-[13px] font-medium outline-none focus:ring-2 focus:ring-[#DB2777]/30"
        />
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 text-slate-400 animate-spin" /></div>
      ) : suppliers.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-[22px] border border-slate-200/80">
          <p className="text-xs font-bold text-slate-500">Hozircha supplierlar mavjud emas.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {suppliers.map((s) => (
            <button
              key={s.id}
              onClick={() => setB2BRoute({ view: 'supplier', id: s.id })}
              className="w-full flex items-center gap-3 bg-white rounded-[18px] border border-slate-200/80 p-3 text-left hover:border-[#DB2777]/40 transition-colors"
            >
              <div className="w-12 h-12 rounded-full bg-slate-100 overflow-hidden flex items-center justify-center text-slate-400 font-black shrink-0">
                {s.logoUrl ? <img src={s.logoUrl} alt={s.companyName} className="w-full h-full object-cover" /> : s.companyName.charAt(0)}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <span className="font-bold text-sm text-[#111827] truncate">{s.companyName}</span>
                  <CheckCircle2 className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                </div>
                <p className="text-[11px] text-slate-400 font-medium truncate">{SUPPLIER_TYPE_LABEL[s.supplierType]} · {s.region || 'O\'zbekiston'}</p>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
