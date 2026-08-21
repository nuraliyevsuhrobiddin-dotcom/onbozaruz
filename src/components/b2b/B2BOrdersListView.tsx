import React, { useEffect, useState } from 'react';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { useAgroStore } from '../../store/useAgroStore';
import { B2BOrder } from '../../api/types';

const formatMoney = (value: number) => `${value.toLocaleString('uz-UZ')} so'm`;

const STATUS_LABEL: Record<string, string> = {
  pending: 'Kutilmoqda',
  supplier_confirmed: 'Tasdiqlandi',
  preparing: 'Tayyorlanmoqda',
  ready: 'Tayyor',
  delivering: "Yo'lda",
  delivered: 'Yetkazildi',
  cancelled: 'Bekor qilindi',
  rejected: 'Rad etildi',
};

const STATUS_TONE: Record<string, string> = {
  pending: 'bg-amber-50 text-amber-700',
  supplier_confirmed: 'bg-blue-50 text-blue-700',
  preparing: 'bg-blue-50 text-blue-700',
  ready: 'bg-blue-50 text-blue-700',
  delivering: 'bg-blue-50 text-blue-700',
  delivered: 'bg-emerald-50 text-emerald-700',
  cancelled: 'bg-slate-100 text-slate-500',
  rejected: 'bg-rose-50 text-rose-700',
};

export const B2BOrdersListView: React.FC = () => {
  const { setB2BRoute, b2bOrders, fetchB2BOrders } = useAgroStore();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    void fetchB2BOrders().finally(() => setIsLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="w-full max-w-170 mx-auto py-3 px-3 space-y-3 select-none pb-20">
      <div className="flex items-center gap-3">
        <button onClick={() => setB2BRoute({ view: 'home' })} className="p-2 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="font-black text-lg text-[#111827]">Buyurtmalarim</h1>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 text-slate-400 animate-spin" /></div>
      ) : b2bOrders.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-[22px] border border-slate-200/80">
          <p className="text-xs font-bold text-slate-500">Hozircha buyurtmalar mavjud emas.</p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {b2bOrders.map((order: B2BOrder) => (
            <button
              key={order.id}
              onClick={() => setB2BRoute({ view: 'order', id: order.id })}
              className="w-full text-left bg-white rounded-[20px] border border-slate-200/80 p-3.5 space-y-2 shadow-sm hover:border-[#DB2777]/30 transition-colors"
            >
              <div className="flex items-center justify-between">
                <span className="font-black text-xs text-[#111827]">{order.orderNumber}</span>
                <span className={`px-2.5 py-1 rounded-full text-[10px] font-black ${STATUS_TONE[order.status]}`}>{STATUS_LABEL[order.status]}</span>
              </div>
              <p className="text-[11px] text-slate-400 font-medium">{order.supplierName || 'Supplier'}</p>
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-slate-500 font-semibold">{new Date(order.createdAt).toLocaleDateString('uz-UZ')}</span>
                <span className="font-black text-sm text-[#DB2777]">{formatMoney(order.total)}</span>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export { STATUS_LABEL as B2B_ORDER_STATUS_LABEL, STATUS_TONE as B2B_ORDER_STATUS_TONE };
