import React, { useEffect, useState, useCallback } from 'react';
import { b2bAdminRepository } from '../../api/b2bAdminRepository';
import { CommissionLedgerEntry } from '../../api/types';

const formatMoney = (value: number) => `${value.toLocaleString('uz-UZ')} so'm`;
const STATUS_TONE: Record<string, string> = { pending: 'bg-amber-50 text-amber-700', settled: 'bg-emerald-50 text-emerald-700', voided: 'bg-slate-100 text-slate-500' };
const STATUS_LABEL: Record<string, string> = { pending: 'Kutilmoqda', settled: 'Yakunlangan', voided: 'Bekor qilingan' };

export const AdminB2BCommissionTab: React.FC = () => {
  const [ledger, setLedger] = useState<CommissionLedgerEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setLedger(await b2bAdminRepository.listCommissionLedger());
    setLoading(false);
  }, []);

  useEffect(() => { void load(); }, [load]);

  const active = ledger.filter((l) => l.status !== 'voided');
  const totalGross = active.reduce((s, l) => s + l.grossAmount, 0);
  const totalCommission = active.reduce((s, l) => s + l.commissionAmount, 0);

  return (
    <div className="space-y-4 select-none">
      <div>
        <h2 className="font-black text-xl text-[#111827]">Komissiya</h2>
        <p className="text-xs text-slate-400 font-medium">{ledger.length} ta yozuv</p>
      </div>

      <div className="grid grid-cols-2 gap-2.5">
        <div className="bg-white rounded-[18px] border border-slate-200/80 p-3.5">
          <span className="text-[10px] font-bold text-slate-400 uppercase block">Jami aylanma</span>
          <span className="font-black text-base text-[#111827]">{formatMoney(totalGross)}</span>
        </div>
        <div className="bg-white rounded-[18px] border border-slate-200/80 p-3.5">
          <span className="text-[10px] font-bold text-slate-400 uppercase block">Onbozar komissiyasi</span>
          <span className="font-black text-base text-[#DB2777]">{formatMoney(totalCommission)}</span>
        </div>
      </div>

      {loading ? (
        <div className="space-y-2">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-14 rounded-[16px] bg-slate-100 animate-pulse" />)}</div>
      ) : ledger.length === 0 ? (
        <div className="text-center py-10 text-xs font-bold text-slate-400">Hozircha komissiya yozuvlari yo'q</div>
      ) : (
        <div className="space-y-2">
          {ledger.map((l) => (
            <div key={l.id} className="bg-white rounded-[16px] border border-slate-200/80 p-3 flex items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="text-[11px] font-bold text-[#111827]">{formatMoney(l.grossAmount)} · {l.commissionRate}%</p>
                <p className="text-[10px] text-slate-400 font-medium">{new Date(l.createdAt).toLocaleDateString('uz-UZ')} · {l.paymentMethod === 'cash' ? 'Naqd' : 'Onlayn'}</p>
              </div>
              <div className="text-right shrink-0">
                <p className="text-xs font-black text-[#DB2777]">{formatMoney(l.commissionAmount)}</p>
                <span className={`px-2 py-0.5 rounded-full text-[9px] font-black ${STATUS_TONE[l.status]}`}>{STATUS_LABEL[l.status]}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
