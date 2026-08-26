import React, { useEffect, useState } from 'react';
import { ArrowLeft, Loader2, Package, RefreshCw, ChevronRight, ShoppingBag, ShieldCheck, Clock } from 'lucide-react';
import { useAgroStore } from '../../store/useAgroStore';
import { B2BOrder } from '../../api/types';
import { formatMoney, B2B_ORDER_STATUS_LABEL as STATUS_LABEL, B2B_ORDER_STATUS_TONE as STATUS_TONE } from '../../utils/b2bUtils';

const STATUS_DOT: Record<string, string> = {
  pending: 'bg-amber-400',
  confirmed: 'bg-blue-400',
  shipped: 'bg-violet-400',
  delivered: 'bg-emerald-400',
  cancelled: 'bg-red-400',
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
          <button
            onClick={() => setB2BRoute({ view: 'home' })}
            className="p-2 rounded-xl bg-white hover:bg-slate-50 text-slate-600 hover:text-slate-900 transition-colors border border-slate-200"
          >
            <ArrowLeft className="w-4.5 h-4.5" />
          </button>
          <div>
            <h1 className="font-black text-lg text-slate-900">Buyurtmalarim</h1>
            {b2bOrders.length > 0 && (
              <p className="text-[11px] text-slate-500 font-semibold">
                <span className="text-blue-600 font-bold">{b2bOrders.length}</span> ta buyurtma
              </p>
            )}
          </div>
        </div>

        {isAuthenticated && (
          <button
            onClick={handleRefresh}
            disabled={isRefreshing || isLoading}
            className="p-2 rounded-xl bg-white hover:bg-slate-50 text-slate-600 hover:text-slate-900 transition-colors disabled:opacity-40 border border-slate-200"
            title="Yangilash"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          </button>
        )}
      </div>

      {/* Not authenticated */}
      {!isAuthenticated ? (
        <div className="min-h-[55vh] flex items-center justify-center">
          <div className="w-full max-w-sm text-center py-16 px-4 bg-white rounded-2xl border border-slate-200 space-y-4">
            <div className="w-14 h-14 rounded-2xl bg-blue-50 border border-blue-200 text-blue-600 flex items-center justify-center mx-auto">
              <ShieldCheck className="w-7 h-7" />
            </div>
            <div className="space-y-1.5">
              <h3 className="text-base font-black text-slate-900">Tizimga kiring</h3>
              <p className="text-xs text-slate-500 font-medium max-w-xs mx-auto">
                Buyurtmalaringiz tarixi va ularning holatini ko'rish uchun profilingizga kiring.
              </p>
            </div>
            <button
              onClick={() => setAuthPromptOpen(true)}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-blue-500 hover:bg-blue-600 text-white font-black text-xs shadow-lg shadow-blue-500/25 transition-colors border border-blue-400/30"
            >
              Tizimga kirish
            </button>
          </div>
        </div>
      ) : isLoading ? (
        <div className="flex flex-col items-center justify-center gap-3 py-16">
          <Loader2 className="w-6 h-6 text-blue-400 animate-spin" />
          <span className="text-xs text-slate-500 font-medium">Yuklanmoqda...</span>
        </div>
      ) : b2bOrders.length === 0 ? (
        <div className="min-h-[55vh] flex items-center justify-center">
          <div className="w-full max-w-sm text-center py-16 px-4 bg-white rounded-2xl border border-slate-200 space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-slate-100 border border-slate-200 text-slate-400 flex items-center justify-center mx-auto">
              <Package className="w-8 h-8 stroke-[1.75]" />
            </div>
            <div className="space-y-1.5">
              <h3 className="text-base font-black text-slate-900">Hozircha buyurtmalar yo'q</h3>
              <p className="text-xs text-slate-500 font-medium max-w-xs mx-auto">
                Siz bergan ulgurji buyurtmalar shu yerda ko'rinadi va holati kuzatib boriladi.
              </p>
            </div>
            <button
              onClick={() => setB2BRoute({ view: 'products' })}
              className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-blue-500 hover:bg-blue-600 text-white font-black text-xs shadow-lg shadow-blue-500/25 transition-colors border border-blue-400/30"
            >
              <ShoppingBag className="w-4 h-4" />
              <span>Mahsulotlar katalogiga o'tish</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-2.5">
          {b2bOrders.map((order: B2BOrder) => (
            <button
              key={order.id}
              onClick={() => setB2BRoute({ view: 'order', id: order.id })}
              className="group w-full text-left bg-white rounded-2xl border border-slate-200 p-4 space-y-3 hover:border-blue-300 hover:shadow-sm transition-all"
            >
              {/* Top row */}
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  {/* Status dot */}
                  <div className={`w-2 h-2 rounded-full ${STATUS_DOT[order.status] || 'bg-slate-400'} shadow-sm`} />
                  <span className="font-black text-xs text-slate-900">{order.orderNumber}</span>
                  <span className={`px-2 py-0.5 rounded-full text-[9px] font-black border ${STATUS_TONE[order.status] || 'bg-slate-100 text-slate-500 border-slate-200'}`}>
                    {STATUS_LABEL[order.status] || order.status}
                  </span>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-blue-500 group-hover:translate-x-0.5 transition-all" />
              </div>

              {/* Middle info */}
              <div className="flex items-center justify-between">
                <p className="text-[11px] text-slate-600 font-bold truncate flex items-center gap-1.5">
                  <Package className="w-3 h-3 text-slate-400 shrink-0" />
                  {order.supplierName || 'Yetkazib beruvchi'}
                </p>
                <span className="text-[10px] text-slate-400 font-medium flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {new Date(order.createdAt).toLocaleDateString('uz-UZ')}
                </span>
              </div>

              {/* Bottom row */}
              <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                <span className="text-[10px] text-slate-400 font-medium">
                  To'lov: {order.paymentMethod === 'cash' ? 'Naqd' : 'Onlayn'}
                </span>
                <span className="font-black text-sm text-blue-600">{formatMoney(order.total)}</span>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export { STATUS_LABEL as B2B_ORDER_STATUS_LABEL, STATUS_TONE as B2B_ORDER_STATUS_TONE };
