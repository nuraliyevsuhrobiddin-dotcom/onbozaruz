import React, { useEffect, useState } from 'react';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { useAgroStore } from '../../store/useAgroStore';

const formatMoney = (value: number) => `${value.toLocaleString('uz-UZ')} so'm`;

type RangeKey = 'today' | '7d' | '30d' | 'all';

function rangeToIso(range: RangeKey): string | undefined {
  if (range === 'all') return undefined;
  const now = new Date();
  if (range === 'today') { now.setHours(0, 0, 0, 0); return now.toISOString(); }
  const days = range === '7d' ? 7 : 30;
  now.setDate(now.getDate() - days);
  return now.toISOString();
}

export const B2BFinanceView: React.FC = () => {
  const { setB2BRoute, supplierProfile, supplierFinanceSummary, fetchOwnSupplierFinanceSummary } = useAgroStore();
  const [range, setRange] = useState<RangeKey>('30d');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!supplierProfile) return;
    setIsLoading(true);
    void fetchOwnSupplierFinanceSummary(rangeToIso(range)).finally(() => setIsLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [range, supplierProfile?.id]);

  if (!supplierProfile) {
    return (
      <div className="w-full max-w-lg mx-auto py-16 px-4 text-center">
        <p className="text-sm font-bold text-slate-600">Moliya bo'limi faqat supplierlar uchun.</p>
      </div>
    );
  }

  const s = supplierFinanceSummary;

  return (
    <div className="w-full max-w-lg mx-auto py-3 px-3 space-y-4 select-none pb-10">
      <div className="flex items-center gap-3">
        <button onClick={() => setB2BRoute({ view: 'dashboard' })} className="p-2 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="font-black text-lg text-[#111827]">Moliya</h1>
      </div>

      <div className="flex gap-1.5">
        {([['today', 'Bugun'], ['7d', '7 kun'], ['30d', '30 kun'], ['all', 'Barchasi']] as [RangeKey, string][]).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setRange(key)}
            className={`px-3 py-1.5 rounded-full text-[11px] font-bold transition-colors ${range === key ? 'bg-[#111827] text-white' : 'bg-slate-100 text-slate-600'}`}
          >{label}</button>
        ))}
      </div>

      {isLoading || !s ? (
        <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 text-slate-400 animate-spin" /></div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-2.5">
            <div className="bg-white rounded-[18px] border border-slate-200/80 p-3.5 space-y-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase">Jami savdo</span>
              <span className="block font-black text-base text-[#111827]">{formatMoney(s.grossSales)}</span>
            </div>
            <div className="bg-white rounded-[18px] border border-slate-200/80 p-3.5 space-y-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase">Onbozar komissiyasi</span>
              <span className="block font-black text-base text-rose-600">{formatMoney(s.totalCommission)}</span>
            </div>
            <div className="bg-white rounded-[18px] border border-slate-200/80 p-3.5 space-y-1 col-span-2">
              <span className="text-[10px] font-bold text-slate-400 uppercase">Sof summa</span>
              <span className="block font-black text-lg text-emerald-600">{formatMoney(s.netAmount)}</span>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2.5">
            <div className="bg-slate-50 rounded-[16px] p-3 text-center">
              <span className="block font-black text-sm text-[#111827]">{s.completedOrders}</span>
              <span className="text-[10px] text-slate-400 font-bold">Yakunlangan</span>
            </div>
            <div className="bg-slate-50 rounded-[16px] p-3 text-center">
              <span className="block font-black text-sm text-[#111827]">{s.pendingOrders}</span>
              <span className="text-[10px] text-slate-400 font-bold">Jarayonda</span>
            </div>
            <div className="bg-slate-50 rounded-[16px] p-3 text-center">
              <span className="block font-black text-sm text-[#111827]">{s.cashOrders}</span>
              <span className="text-[10px] text-slate-400 font-bold">Naqd</span>
            </div>
            <div className="bg-slate-50 rounded-[16px] p-3 text-center">
              <span className="block font-black text-sm text-[#111827]">{s.onlineOrders}</span>
              <span className="text-[10px] text-slate-400 font-bold">Onlayn</span>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
