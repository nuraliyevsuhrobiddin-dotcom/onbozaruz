import React, { useEffect, useState } from 'react';
import { ArrowLeft, Search, CheckCircle2, Loader2, Building2 } from 'lucide-react';
import { useAgroStore } from '../../store/useAgroStore';
import { b2bRepository } from '../../api/b2bRepository';
import { SupplierProfile } from '../../api/types';
import { B2B_SUPPLIER_TYPE_LABEL as SUPPLIER_TYPE_LABEL } from '../../utils/b2bUtils';

const TYPE_COLORS: Record<string, string> = {
  manufacturer: 'text-blue-700 bg-blue-50 border-blue-200',
  importer: 'text-violet-700 bg-violet-50 border-violet-200',
  distributor: 'text-amber-700 bg-amber-50 border-amber-200',
  supplier: 'text-emerald-700 bg-emerald-50 border-emerald-200',
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
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => setB2BRoute({ view: 'home' })}
          className="p-2 rounded-xl bg-white hover:bg-slate-50 text-slate-600 hover:text-slate-900 transition-colors border border-slate-200"
        >
          <ArrowLeft className="w-4.5 h-4.5" />
        </button>
        <div>
          <h1 className="font-black text-lg text-slate-900">Ishlab chiqaruvchilar</h1>
          <p className="text-[10px] text-slate-500 font-medium">
            <span className="text-blue-600 font-bold">{suppliers.length}</span> ta supplier
          </p>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Kompaniya nomi bo'yicha qidirish..."
          className="w-full bg-white border border-slate-200 rounded-xl pl-10 pr-4 py-3 text-[13px] font-medium text-slate-800 placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition-all"
        />
      </div>

      {/* List */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center gap-3 py-16">
          <Loader2 className="w-6 h-6 text-blue-400 animate-spin" />
          <span className="text-xs text-slate-500 font-medium">Yuklanmoqda...</span>
        </div>
      ) : suppliers.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-slate-200">
          <Building2 className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <p className="text-xs font-bold text-slate-500">Hozircha supplierlar mavjud emas.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {suppliers.map((s) => (
            <button
              key={s.id}
              onClick={() => setB2BRoute({ view: 'supplier', id: s.id })}
              className="group w-full flex items-center gap-3 bg-white rounded-2xl border border-slate-200 p-3.5 text-left hover:border-blue-300 hover:shadow-sm transition-all"
            >
              {/* Avatar */}
              <div className="w-12 h-12 rounded-xl bg-slate-100 border border-slate-200 overflow-hidden flex items-center justify-center text-slate-500 font-black text-xl shrink-0">
                {s.logoUrl
                  ? <img src={s.logoUrl} alt={s.companyName} className="w-full h-full object-cover" />
                  : s.companyName.charAt(0)
                }
              </div>

              {/* Info */}
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <span className="font-bold text-sm text-slate-800 truncate">{s.companyName}</span>
                  <CheckCircle2 className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                </div>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className={`text-[9px] font-black px-1.5 py-0.5 rounded-full border ${TYPE_COLORS[s.supplierType] || 'text-slate-600 bg-slate-100 border-slate-200'}`}>
                    {SUPPLIER_TYPE_LABEL[s.supplierType]}
                  </span>
                  <span className="text-[10px] text-slate-400 font-medium">{s.region || "O'zbekiston"}</span>
                </div>
              </div>

              {/* Arrow */}
              <div className="text-slate-300 group-hover:text-blue-500 transition-colors shrink-0">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
