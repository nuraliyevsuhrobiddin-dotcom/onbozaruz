import React, { useEffect, useState, useCallback } from 'react';
import { Search } from 'lucide-react';
import { b2bAdminRepository } from '../../api/b2bAdminRepository';
import { B2BOrder } from '../../api/types';
import { formatMoney, B2B_ORDER_STATUS_LABEL as STATUS_LABEL, B2B_ORDER_STATUS_TONE as STATUS_TONE } from '../../utils/b2bUtils';

/** Buyurtma holatini bu yerdan o'zgartirib bo'lmaydi — bu supplierning o'z
 *  panelida boshqariladi (B2BSupplierDashboardView). Bu yer faqat kuzatuv. */
export const AdminB2BOrdersTab: React.FC<{ showToast: (msg: string) => void }> = () => {
  const [orders, setOrders] = useState<B2BOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setOrders(await b2bAdminRepository.listAllB2BOrders());
    setLoading(false);
  }, []);

  useEffect(() => { void load(); }, [load]);

  const filtered = orders.filter((o) =>
    !search || o.orderNumber.toLowerCase().includes(search.toLowerCase()) ||
    (o.supplierName || '').toLowerCase().includes(search.toLowerCase()) ||
    (o.businessName || '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-4 select-none">
      <div>
        <h2 className="font-black text-xl text-[#111827]">B2B Buyurtmalar</h2>
        <p className="text-xs text-slate-400 font-medium">{orders.length} ta buyurtma — holatni supplier o'zi boshqaradi</p>
      </div>

      <div className="relative">
        <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buyurtma raqami, supplier yoki do'kon..." className="w-full bg-slate-100 rounded-2xl pl-10 pr-4 py-2.5 text-xs font-medium outline-none" />
      </div>

      {loading ? (
        <div className="space-y-2">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-16 rounded-[18px] bg-slate-100 animate-pulse" />)}</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-10 text-xs font-bold text-slate-400">Hozircha buyurtmalar yo'q</div>
      ) : (
        <div className="space-y-2">
          {filtered.map((o) => (
            <div key={o.id} className="bg-white rounded-[18px] border border-slate-200/80 p-3 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-xs font-black text-[#111827]">{o.orderNumber}</p>
                <p className="text-[10px] text-slate-400 font-medium truncate">{o.supplierName} → {o.businessName}</p>
              </div>
              <div className="text-right shrink-0">
                <span className={`px-2 py-1 rounded-full text-[9px] font-black ${STATUS_TONE[o.status]}`}>{STATUS_LABEL[o.status]}</span>
                <p className="text-xs font-black text-[#111827] mt-1">{formatMoney(o.total)}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
