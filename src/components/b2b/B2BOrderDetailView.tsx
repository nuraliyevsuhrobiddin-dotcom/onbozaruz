import React, { useEffect, useState } from 'react';
import { ArrowLeft, Loader2, MapPin, Phone, Banknote, Package, CheckCircle, Clock, XCircle } from 'lucide-react';
import { useAgroStore } from '../../store/useAgroStore';
import { b2bRepository } from '../../api/b2bRepository';
import { B2BOrder } from '../../api/types';
import { formatMoney, B2B_ORDER_STATUS_LABEL as STATUS_LABEL, B2B_ORDER_STEPS as STEPS } from '../../utils/b2bUtils';

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
    return (
      <div className="w-full max-w-170 mx-auto py-16 flex flex-col items-center gap-3">
        <Loader2 className="w-6 h-6 text-blue-400 animate-spin" />
        <span className="text-xs text-slate-500 font-medium">Yuklanmoqda...</span>
      </div>
    );
  }
  if (!order) {
    return (
      <div className="w-full max-w-170 mx-auto py-16 text-center space-y-3">
        <p className="text-sm font-bold text-slate-500">Buyurtma topilmadi</p>
        <button onClick={() => setB2BRoute({ view: 'orders' })} className="text-xs font-bold text-blue-600 hover:text-blue-700">Orqaga</button>
      </div>
    );
  }

  const stepIdx = STEPS.findIndex((s) => s.key === order.status);
  const isTerminal = order.status === 'cancelled' || order.status === 'rejected';

  const STEP_ICONS = [Clock, CheckCircle, Package, MapPin, CheckCircle];

  return (
    <div className="w-full max-w-lg mx-auto py-3 px-3 space-y-4 select-none pb-10">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => setB2BRoute({ view: 'orders' })}
          className="p-2 rounded-xl bg-white hover:bg-slate-50 text-slate-600 hover:text-slate-900 transition-colors border border-slate-200"
        >
          <ArrowLeft className="w-4.5 h-4.5" />
        </button>
        <div>
          <h1 className="font-black text-lg text-slate-900">{order.orderNumber}</h1>
          <p className="text-[11px] text-slate-500 font-medium">
            {new Date(order.createdAt).toLocaleString('uz-UZ')}
          </p>
        </div>
      </div>

      {/* Status */}
      {isTerminal ? (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-4 flex items-start gap-3">
          <XCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
          <div>
            <p className="text-xs font-black text-red-600">{STATUS_LABEL[order.status]}</p>
            {order.rejectionReason && <p className="text-xs text-red-600/70 mt-1">{order.rejectionReason}</p>}
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 p-4">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-3">Buyurtma holati</p>
          <div className="flex items-center gap-1.5">
            {STEPS.map((step, idx) => {
              const Icon = STEP_ICONS[idx] || CheckCircle;
              const isDone = idx <= stepIdx;
              const isCurrent = idx === stepIdx;
              return (
                <React.Fragment key={step.key}>
                  <div className="flex flex-col items-center gap-1 shrink-0">
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center transition-all ${
                      isDone
                        ? isCurrent
                          ? 'bg-blue-500 shadow-lg shadow-blue-500/30'
                          : 'bg-emerald-50 border border-emerald-200'
                        : 'bg-slate-100 border border-slate-200'
                    }`}>
                      <Icon className={`w-3.5 h-3.5 ${isDone ? isCurrent ? 'text-white' : 'text-emerald-600' : 'text-slate-400'}`} />
                    </div>
                    <span className={`text-[8px] font-bold text-center leading-tight ${isDone ? isCurrent ? 'text-blue-600' : 'text-slate-600' : 'text-slate-400'}`}>
                      {step.label}
                    </span>
                  </div>
                  {idx < STEPS.length - 1 && (
                    <div className={`flex-1 h-0.5 rounded-full mb-3.5 transition-all ${idx < stepIdx ? 'bg-emerald-400' : 'bg-slate-200'}`} />
                  )}
                </React.Fragment>
              );
            })}
          </div>
        </div>
      )}

      {/* Items */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 space-y-3">
        <h2 className="font-black text-sm text-slate-900 flex items-center gap-2">
          <Package className="w-4 h-4 text-blue-500" /> Mahsulotlar
        </h2>
        <div className="space-y-2.5">
          {(order.items || []).map((item) => (
            <div key={item.id} className="flex items-center gap-3">
              {item.productImage && (
                <div className="w-11 h-11 rounded-xl bg-slate-100 border border-slate-200 overflow-hidden shrink-0">
                  <img src={item.productImage} alt={item.productName} className="w-full h-full object-cover" />
                </div>
              )}
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold text-slate-800 truncate">{item.productName}</p>
                <p className="text-[10px] text-slate-500 font-medium mt-0.5">
                  {item.quantity} {item.unit} × {formatMoney(item.unitPrice)}
                </p>
              </div>
              <span className="text-xs font-black text-blue-600">{formatMoney(item.lineTotal)}</span>
            </div>
          ))}
        </div>
        <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
          <span className="text-xs font-bold text-slate-500">Jami</span>
          <span className="font-black text-lg text-blue-600">{formatMoney(order.total)}</span>
        </div>
      </div>

      {/* Delivery */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 space-y-3">
        <h2 className="font-black text-sm text-slate-900">Yetkazib berish</h2>
        <p className="text-xs text-slate-600 flex items-start gap-2">
          <MapPin className="w-3.5 h-3.5 text-blue-500 mt-0.5 shrink-0" />
          {order.deliveryStoreName}, {order.deliveryRegion} {order.deliveryDistrict}, {order.deliveryAddress}
        </p>
        {order.deliveryPhone && (
          <a
            href={`tel:${order.deliveryPhone}`}
            className="text-xs font-bold text-blue-600 flex items-center gap-2 hover:text-blue-700 transition-colors"
          >
            <Phone className="w-3.5 h-3.5" /> {order.deliveryPhone}
          </a>
        )}
        <p className="text-xs text-slate-500 flex items-center gap-2">
          <Banknote className="w-3.5 h-3.5 text-emerald-500" />
          {order.paymentMethod === 'cash' ? "Naqd to'lov" : "Onlayn to'lov"}
          {' — '}
          {order.paymentStatus === 'cash_confirmed' ? (
            <span className="text-emerald-600 font-bold">tasdiqlandi</span>
          ) : (
            <span className="text-amber-600 font-bold">kutilmoqda</span>
          )}
        </p>
      </div>
    </div>
  );
};
