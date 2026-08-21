import React, { useEffect, useState } from 'react';
import { ArrowLeft, Loader2, MapPin, Phone, Banknote } from 'lucide-react';
import { useAgroStore } from '../../store/useAgroStore';
import { b2bRepository } from '../../api/b2bRepository';
import { B2BOrder } from '../../api/types';

const formatMoney = (value: number) => `${value.toLocaleString('uz-UZ')} so'm`;

const STATUS_LABEL: Record<string, string> = {
  pending: 'Kutilmoqda', supplier_confirmed: 'Tasdiqlandi', preparing: 'Tayyorlanmoqda',
  ready: 'Tayyor', delivering: "Yo'lda", delivered: 'Yetkazildi', cancelled: 'Bekor qilindi', rejected: 'Rad etildi',
};
const STEPS: { key: string; label: string }[] = [
  { key: 'pending', label: 'Qabul' },
  { key: 'supplier_confirmed', label: 'Tasdiq' },
  { key: 'preparing', label: 'Tayyor' },
  { key: 'delivering', label: "Yo'lda" },
  { key: 'delivered', label: 'Yetdi' },
];

interface Props {
  orderId: string;
}

export const B2BOrderDetailView: React.FC<Props> = ({ orderId }) => {
  const { setB2BRoute } = useAgroStore();
  const [order, setOrder] = useState<B2BOrder | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    b2bRepository.getB2BOrder(orderId).then((o) => {
      if (!cancelled) { setOrder(o); setIsLoading(false); }
    });
    return () => { cancelled = true; };
  }, [orderId]);

  if (isLoading) {
    return <div className="w-full max-w-170 mx-auto py-16 flex justify-center"><Loader2 className="w-6 h-6 text-slate-400 animate-spin" /></div>;
  }
  if (!order) {
    return (
      <div className="w-full max-w-170 mx-auto py-16 text-center space-y-3">
        <p className="text-sm font-bold text-slate-500">Buyurtma topilmadi</p>
        <button onClick={() => setB2BRoute({ view: 'orders' })} className="text-xs font-bold text-[#DB2777]">Orqaga</button>
      </div>
    );
  }

  const stepIdx = STEPS.findIndex((s) => s.key === order.status);
  const isTerminal = order.status === 'cancelled' || order.status === 'rejected';

  return (
    <div className="w-full max-w-lg mx-auto py-3 px-3 space-y-4 select-none pb-10">
      <div className="flex items-center gap-3">
        <button onClick={() => setB2BRoute({ view: 'orders' })} className="p-2 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="font-black text-lg text-[#111827]">{order.orderNumber}</h1>
          <p className="text-[11px] text-slate-400 font-medium">{new Date(order.createdAt).toLocaleString('uz-UZ')}</p>
        </div>
      </div>

      {isTerminal ? (
        <div className="bg-rose-50 border border-rose-200 rounded-2xl p-3.5">
          <p className="text-xs font-black text-rose-700">{STATUS_LABEL[order.status]}</p>
          {order.rejectionReason && <p className="text-xs text-rose-600 mt-1">{order.rejectionReason}</p>}
        </div>
      ) : (
        <div className="grid grid-cols-5 gap-1.5">
          {STEPS.map((step, idx) => (
            <div key={step.key} className="space-y-1">
              <div className={`h-1.5 rounded-full ${idx <= stepIdx ? 'bg-[#DB2777]' : 'bg-slate-200'}`} />
              <span className={`text-[9px] font-bold block text-center ${idx <= stepIdx ? 'text-[#111827]' : 'text-slate-400'}`}>{step.label}</span>
            </div>
          ))}
        </div>
      )}

      <div className="bg-white rounded-[20px] border border-slate-200/80 p-4 space-y-2.5 shadow-sm">
        <h2 className="font-black text-sm text-[#111827]">Mahsulotlar</h2>
        {(order.items || []).map((item) => (
          <div key={item.id} className="flex items-center gap-2.5">
            {item.productImage && <img src={item.productImage} alt={item.productName} className="w-11 h-11 rounded-[10px] object-cover bg-slate-100 shrink-0" />}
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold text-[#111827] truncate">{item.productName}</p>
              <p className="text-[10px] text-slate-400 font-medium">{item.quantity} {item.unit} × {formatMoney(item.unitPrice)}</p>
            </div>
            <span className="text-xs font-black text-[#111827]">{formatMoney(item.lineTotal)}</span>
          </div>
        ))}
        <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
          <span className="text-xs font-bold text-slate-500">Jami</span>
          <span className="font-black text-base text-[#DB2777]">{formatMoney(order.total)}</span>
        </div>
      </div>

      <div className="bg-white rounded-[20px] border border-slate-200/80 p-4 space-y-2 shadow-sm">
        <h2 className="font-black text-sm text-[#111827]">Yetkazib berish</h2>
        <p className="text-xs text-slate-600 flex items-start gap-1.5"><MapPin className="w-3.5 h-3.5 mt-0.5 shrink-0" /> {order.deliveryStoreName}, {order.deliveryRegion} {order.deliveryDistrict}, {order.deliveryAddress}</p>
        {order.deliveryPhone && <a href={`tel:${order.deliveryPhone}`} className="text-xs font-bold text-[#DB2777] flex items-center gap-1.5"><Phone className="w-3.5 h-3.5" /> {order.deliveryPhone}</a>}
        <p className="text-xs text-slate-500 flex items-center gap-1.5"><Banknote className="w-3.5 h-3.5" /> {order.paymentMethod === 'cash' ? 'Naqd to\'lov' : 'Onlayn to\'lov'} — {order.paymentStatus === 'cash_confirmed' ? 'tasdiqlandi' : 'kutilmoqda'}</p>
      </div>
    </div>
  );
};
