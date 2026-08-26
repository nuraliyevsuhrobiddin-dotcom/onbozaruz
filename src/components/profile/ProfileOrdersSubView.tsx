import React, { useState, useEffect } from 'react';
import {
  ArrowLeft,
  Clock,
  Truck,
  Building2,
  Store,
  ChevronRight,
  RefreshCw,
  Loader2,
  ShoppingBag,
} from 'lucide-react';
import { useAgroStore } from '../../store/useAgroStore';
import { B2BOrder } from '../../api/types';
import {
  formatMoney,
  B2B_ORDER_STATUS_LABEL,
  B2B_ORDER_STATUS_TONE,
} from '../../utils/b2bUtils';

interface ProfileOrdersSubViewProps {
  onBack: () => void;
  showToast: (msg: string) => void;
}

export const ProfileOrdersSubView: React.FC<ProfileOrdersSubViewProps> = ({
  onBack,
  showToast,
}) => {
  const {
    b2bOrders,
    supplierB2BOrders,
    supplierProfile,
    fetchB2BOrders,
    fetchSupplierB2BOrders,
    setB2BRoute,
    setActiveTab,
  } = useAgroStore();

  const [activeTabType, setActiveTabType] = useState<'buyer' | 'supplier'>('buyer');
  const [isLoading, setIsLoading] = useState(false);

  const isSupplier = Boolean(supplierProfile);

  const loadAllOrders = async () => {
    setIsLoading(true);
    try {
      await Promise.all([
        fetchB2BOrders(),
        isSupplier ? fetchSupplierB2BOrders() : Promise.resolve(),
      ]);
    } catch {
      showToast("Buyurtmalarni yuklashda xatolik yuz berdi");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadAllOrders();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSupplier]);

  const currentOrders: B2BOrder[] = activeTabType === 'buyer' ? b2bOrders : supplierB2BOrders;

  const handleOpenOrderDetail = (orderId: string) => {
    setActiveTab('market');
    setB2BRoute({ view: 'order', id: orderId });
  };

  return (
    <div className="w-full max-w-xl mx-auto py-3 px-3.5 space-y-4 select-none pb-24">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-2 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="font-black text-lg text-[#111827]">B2B Ulgurji Buyurtmalar</h1>
            <p className="text-[11px] text-slate-400 font-medium">
              Ulgurji shartnomalar, buyurtmalar va yetkazib berish holati
            </p>
          </div>
        </div>

        <button
          onClick={loadAllOrders}
          disabled={isLoading}
          className="p-2 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer disabled:opacity-40"
          title="Yangilash"
        >
          <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Tabs: Xaridlarim vs Sotuvlarim (if supplier) */}
      {isSupplier && (
        <div className="flex bg-slate-100 p-1 rounded-2xl">
          <button
            type="button"
            onClick={() => setActiveTabType('buyer')}
            className={`flex-1 py-2.5 rounded-xl font-black text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              activeTabType === 'buyer'
                ? 'bg-white text-slate-950 shadow-xs'
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            <Store className="w-3.5 h-3.5" />
            <span>Xaridlarim ({b2bOrders.length})</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTabType('supplier')}
            className={`flex-1 py-2.5 rounded-xl font-black text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              activeTabType === 'supplier'
                ? 'bg-white text-slate-950 shadow-xs'
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            <Building2 className="w-3.5 h-3.5" />
            <span>Sotuvlarim ({supplierB2BOrders.length})</span>
          </button>
        </div>
      )}

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-2">
        <div className="bg-white rounded-2xl border border-slate-200/80 p-3 text-center shadow-xs">
          <span className="block font-black text-lg text-slate-950">{currentOrders.length}</span>
          <span className="text-[10px] text-slate-400 font-bold uppercase">Jami buyurtma</span>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200/80 p-3 text-center shadow-xs">
          <span className="block font-black text-lg text-blue-600">
            {currentOrders.filter((o) => o.status === 'delivering' || o.status === 'preparing' || o.status === 'supplier_confirmed' || o.status === 'ready').length}
          </span>
          <span className="text-[10px] text-slate-400 font-bold uppercase">Jarayonda</span>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200/80 p-3 text-center shadow-xs">
          <span className="block font-black text-lg text-emerald-600">
            {currentOrders.filter((o) => o.status === 'delivered').length}
          </span>
          <span className="text-[10px] text-slate-400 font-bold uppercase">Yetkazildi</span>
        </div>
      </div>

      {/* Orders List */}
      {isLoading ? (
        <div className="py-16 flex flex-col items-center justify-center gap-3 text-slate-400">
          <Loader2 className="w-6 h-6 animate-spin text-[#D84315]" />
          <span className="text-xs font-semibold">Buyurtmalar yuklanmoqda...</span>
        </div>
      ) : currentOrders.length > 0 ? (
        <div className="space-y-3">
          {currentOrders.map((order) => {
            const statusLabel = B2B_ORDER_STATUS_LABEL[order.status] || order.status;
            const statusTone = B2B_ORDER_STATUS_TONE[order.status] || 'bg-slate-100 text-slate-700';

            return (
              <div
                key={order.id}
                onClick={() => handleOpenOrderDetail(order.id)}
                className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-xs hover:border-[#D84315]/40 transition-all cursor-pointer group space-y-3"
              >
                {/* Top Info */}
                <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-2.5">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-black text-slate-900">
                      #{order.orderNumber || order.id.slice(0, 8).toUpperCase()}
                    </span>
                    <span className={`px-2 py-0.5 rounded-md text-[10px] font-black ${statusTone}`}>
                      {statusLabel}
                    </span>
                  </div>
                  <span className="text-[10px] font-semibold text-slate-400 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {new Date(order.createdAt).toLocaleDateString('uz-UZ', {
                      day: 'numeric',
                      month: 'short',
                    })}
                  </span>
                </div>

                {/* Counterparty details */}
                <div className="flex items-center justify-between text-xs">
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 block uppercase">
                      {activeTabType === 'buyer' ? "Yetkazib beruvchi" : "Xaridor do'kon"}
                    </span>
                    <span className="font-extrabold text-slate-900">
                      {activeTabType === 'buyer'
                        ? order.supplierName || 'Ta\'minotchi'
                        : order.businessName || order.deliveryStoreName || 'Xaridor biznes'}
                    </span>
                  </div>

                  <div className="text-right">
                    <span className="text-[10px] font-bold text-slate-400 block uppercase">Umumiy summa</span>
                    <span className="font-black text-sm text-emerald-600">
                      {formatMoney(order.total || order.subtotal || 0)}
                    </span>
                  </div>
                </div>

                {/* Items summary */}
                {order.items && order.items.length > 0 && (
                  <div className="bg-slate-50 rounded-xl p-2.5 space-y-1">
                    {order.items.slice(0, 2).map((item, idx) => (
                      <div key={idx} className="flex justify-between text-[11px] text-slate-700">
                        <span className="truncate max-w-[200px] font-semibold">{item.productName}</span>
                        <span className="font-bold text-slate-500 shrink-0">
                          {item.quantity} {item.unit} · {formatMoney(item.unitPrice)}
                        </span>
                      </div>
                    ))}
                    {order.items.length > 2 && (
                      <span className="text-[10px] text-slate-400 font-bold block pt-0.5">
                        +{order.items.length - 2} ta boshqa tovarlar
                      </span>
                    )}
                  </div>
                )}

                {/* Footer action */}
                <div className="flex items-center justify-between pt-1 text-[11px] text-slate-500 font-bold">
                  <span className="flex items-center gap-1">
                    <Truck className="w-3.5 h-3.5 text-slate-400" />
                    {order.deliveryAddress ? order.deliveryAddress.slice(0, 28) + '...' : "Yetkazib berish"}
                  </span>
                  <span className="text-[#D84315] font-black group-hover:translate-x-0.5 transition-transform flex items-center gap-0.5">
                    Batafsil ko'rish <ChevronRight className="w-3.5 h-3.5" />
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="py-16 px-4 text-center bg-white rounded-3xl border border-slate-200/80 space-y-4 shadow-xs">
          <div className="w-16 h-16 rounded-2xl bg-orange-50 text-[#D84315] flex items-center justify-center mx-auto">
            <ShoppingBag className="w-8 h-8" />
          </div>
          <div className="space-y-1">
            <h3 className="font-black text-base text-slate-900">
              {activeTabType === 'buyer' ? "Hozircha ulgurji buyurtmalar yo'q" : "Sizga kelgan buyurtmalar yo'q"}
            </h3>
            <p className="text-xs text-slate-400 max-w-xs mx-auto font-medium">
              {activeTabType === 'buyer'
                ? "B2B Bozoridan ulgurji mahsulotlarni tanlang va qulay narxlarda to'g'ridan-to'g'ri ishlab chiqaruvchilardan buyurtma bering."
                : "Mahsulotlaringiz B2B bozorida faol bo'lsa, xaridorlar buyurtmalari shu yerda ko'rinadi."}
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              setActiveTab('market');
              setB2BRoute({ view: 'home' });
            }}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-[#D84315] hover:bg-[#BF360C] text-white font-black text-xs shadow-md transition-colors cursor-pointer"
          >
            <Store className="w-4 h-4" />
            <span>B2B Bozoriga o'tish</span>
          </button>
        </div>
      )}
    </div>
  );
};
