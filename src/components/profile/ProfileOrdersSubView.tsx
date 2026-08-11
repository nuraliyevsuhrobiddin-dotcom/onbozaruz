import React from 'react';
import { ArrowLeft, Phone, Truck } from 'lucide-react';
import { Order } from '../../api/types';

interface ProfileOrdersSubViewProps {
  orders: Order[];
  onBack: () => void;
  showToast: (msg: string) => void;
}

export const ProfileOrdersSubView: React.FC<ProfileOrdersSubViewProps> = ({
  orders,
  onBack,
  showToast,
}) => {
  return (
    <div className="w-full max-w-xl mx-auto py-3 px-3.5 space-y-4 select-none pb-20">
      <div className="flex items-center gap-3">
        <button
          onClick={onBack}
          className="p-2 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="font-black text-lg text-[#111827]">Buyurtmalarim</h1>
          <p className="text-[11px] text-slate-400 font-medium">Faol xaridlar, yetkazib berish va sotuvchi aloqalari</p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2">
        {[
          { label: 'Jami', value: orders.length, tone: 'text-slate-900' },
          { label: "Yo'lda", value: orders.filter((o) => o.status.includes("Yo'lda")).length, tone: 'text-blue-600' },
          { label: 'Qabul', value: orders.filter((o) => o.status.includes('Qabul')).length, tone: 'text-emerald-600' },
        ].map((item) => (
          <div key={item.label} className="bg-white rounded-[18px] border border-slate-200/80 p-3 text-center shadow-sm">
            <span className={`block font-black text-lg ${item.tone}`}>{item.value}</span>
            <span className="text-[10px] text-slate-400 font-bold uppercase">{item.label}</span>
          </div>
        ))}
      </div>

      <div className="space-y-3">
        {orders.length > 0 ? (
          orders.map((order) => (
            <div key={order.id} className="bg-white rounded-[22px] border border-slate-200/80 p-3.5 shadow-sm space-y-3">
              <div className="flex gap-3">
                <img src={order.image} alt={order.productName} className="w-20 h-20 rounded-[16px] object-cover shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <h3 className="font-extrabold text-sm text-[#111827] line-clamp-2">{order.productName}</h3>
                      <p className="text-[11px] text-slate-400 font-medium mt-0.5">{order.sellerName} • {order.date}</p>
                    </div>
                    <span className="px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-black whitespace-nowrap">
                      {order.status}
                    </span>
                  </div>
                  <div className="mt-2 flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-500">{order.quantity}</span>
                    <span className="font-black text-[#E53935]">{order.totalPrice}</span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-4 gap-1.5">
                {['Qabul', "To'lov", "Yo'lda", 'Yetdi'].map((step, idx) => {
                  const active = idx + 1 <= order.statusStep;
                  return (
                    <div key={step} className="space-y-1">
                      <div className={`h-1.5 rounded-full ${active ? 'bg-[#E53935]' : 'bg-slate-200'}`} />
                      <span className={`text-[9px] font-bold ${active ? 'text-[#111827]' : 'text-slate-400'}`}>{step}</span>
                    </div>
                  );
                })}
              </div>

              <div className="grid grid-cols-2 gap-2">
                <a
                  href={`tel:${order.sellerPhone.replace(/\s+/g, '')}`}
                  className="py-2.5 rounded-[14px] bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-black flex items-center justify-center gap-1.5 transition-colors"
                >
                  <Phone className="w-3.5 h-3.5" />
                  Qo'ng'iroq
                </a>
                <button
                  onClick={() => showToast(`${order.id} holati yangilandi`)}
                  className="py-2.5 rounded-[14px] bg-[#111827] hover:bg-black text-white text-xs font-black flex items-center justify-center gap-1.5 transition-colors"
                >
                  <Truck className="w-3.5 h-3.5" />
                  Kuzatish
                </button>
              </div>
            </div>
          ))
        ) : (
          <div className="text-center py-8 bg-white rounded-[22px] border border-slate-200/80 p-4">
            <p className="text-xs font-bold text-slate-500">Hozircha buyurtmalar mavjud emas</p>
          </div>
        )}
      </div>
    </div>
  );
};
