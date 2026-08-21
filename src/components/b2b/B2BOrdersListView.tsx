import React, { useEffect, useState } from 'react';
import { ArrowLeft, Loader2, Package, RefreshCw, ChevronRight, ShoppingBag, ShieldCheck } from 'lucide-react';
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
  pending: 'bg-amber-50 text-amber-700 border border-amber-200/60',
  supplier_confirmed: 'bg-blue-50 text-blue-700 border border-blue-200/60',
  preparing: 'bg-indigo-50 text-indigo-700 border border-indigo-200/60',
  ready: 'bg-purple-50 text-purple-700 border border-purple-200/60',
  delivering: 'bg-cyan-50 text-cyan-700 border border-cyan-200/60',
  delivered: 'bg-emerald-50 text-emerald-700 border border-emerald-200/60',
  cancelled: 'bg-slate-100 text-slate-500 border border-slate-200',
  rejected: 'bg-rose-50 text-rose-700 border border-rose-200/60',
};

export const B2BOrdersListView: React.FC = () => {
  const { setB2BRoute, b2bOrders, fetchB2BOrders, isAuthenticated, setAuthPromptOpen } = useAgroStore();
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const loadOrders = async () => {
    if (!isAuthenticated) {
      setIsLoading(false);
      return;
    }
    try {
      await fetchB2BOrders();
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    void loadOrders();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated]);

  const handleRefresh = () => {
    setIsRefreshing(true);
    void loadOrders();
  };

  return (
    <div className="w-full max-w-170 mx-auto py-3 px-3 space-y-3 select-none pb-24">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => setB2BRoute({ view: 'home' })} className="p-2 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="font-black text-lg text-[#111827]">Buyurtmalarim</h1>
            {b2bOrders.length > 0 && (
              <p className="text-[11px] text-slate-400 font-semibold">{b2bOrders.length} ta buyurtma</p>
            )}
          </div>
        </div>

        {isAuthenticated && (
          <button
            onClick={handleRefresh}
            disabled={isRefreshing || isLoading}
            className="p-2 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors disabled:opacity-50"
            title="Yangilash"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          </button>
        )}
      </div>

      {!isAuthenticated ? (
        <div className="text-center py-16 px-4 bg-white rounded-[24px] border border-slate-200/80 shadow-xs space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-pink-50 text-[#DB2777] flex items-center justify-center mx-auto">
            <ShieldCheck className="w-7 h-7" />
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-black text-[#111827]">Tizimga kiring</h3>
            <p className="text-xs text-slate-400 font-medium max-w-xs mx-auto">
              Buyurtmalaringiz tarixi va ularning holatini ko'rish uchun profilingizga kiring.
            </p>
          </div>
          <button
            onClick={() => setAuthPromptOpen(true)}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-[#DB2777] hover:bg-[#BE185D] text-white font-black text-xs shadow-md transition-colors"
          >
            <span>Tizimga kirish</span>
          </button>
        </div>
      ) : isLoading ? (
        <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 text-slate-400 animate-spin" /></div>
      ) : b2bOrders.length === 0 ? (
        <div className="text-center py-16 px-4 bg-white rounded-[24px] border border-slate-200/80 shadow-xs space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
            <Package className="w-8 h-8 stroke-[1.75]" />
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-black text-[#111827]">Hozircha buyurtmalar yo'q</h3>
            <p className="text-xs text-slate-400 font-medium max-w-xs mx-auto">
              Siz bergan ulgurji buyurtmalar shu yerda ko'rinadi va holati kuzatib boriladi.
            </p>
          </div>
          <button
            onClick={() => setB2BRoute({ view: 'products' })}
            className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-[#DB2777] hover:bg-[#BE185D] text-white font-black text-xs shadow-md transition-colors"
          >
            <ShoppingBag className="w-4 h-4" />
            <span>Mahsulotlar katalogiga o'tish</span>
          </button>
        </div>
      ) : (
        <div className="space-y-2.5">
          {b2bOrders.map((order: B2BOrder) => (
            <button
              key={order.id}
              onClick={() => setB2BRoute({ view: 'order', id: order.id })}
              className="w-full text-left bg-white rounded-[20px] border border-slate-200/80 p-4 space-y-2.5 shadow-xs hover:border-[#DB2777]/40 hover:shadow-sm transition-all group"
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="font-black text-xs text-[#111827]">{order.orderNumber}</span>
                  <span className={`px-2 py-0.5 rounded-full text-[9px] font-black ${STATUS_TONE[order.status] || 'bg-slate-100 text-slate-600'}`}>
                    {STATUS_LABEL[order.status] || order.status}
                  </span>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-[#DB2777] group-hover:translate-x-0.5 transition-all" />
              </div>

              <div className="flex items-center justify-between text-xs">
                <p className="text-[11px] text-slate-500 font-bold truncate">{order.supplierName || 'Yetkazib beruvchi'}</p>
                <span className="text-[10px] text-slate-400 font-medium">{new Date(order.createdAt).toLocaleDateString('uz-UZ')}</span>
              </div>

              <div className="flex items-center justify-between pt-1 border-t border-slate-100">
                <span className="text-[11px] text-slate-400 font-medium">To'lov: {order.paymentMethod === 'cash' ? 'Naqd' : 'Onlayn'}</span>
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
