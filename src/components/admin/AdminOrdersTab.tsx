import React, { useState } from 'react';
import { Search } from 'lucide-react';
import { Order } from '../../api/types';
import { adminRepository } from '../../api/adminRepository';

const ORDER_STATUSES = [
  'Qabul qilindi',
  'Tasdiqlandi',
  'Tayyorlanmoqda',
  "Yo'lda",
  'Yetkazildi',
  'Bekor qilindi',
];

interface AdminOrdersTabProps {
  orders: Order[];
  onUpdateStatus: (orderId: string, status: string, step: number) => void;
  onLogAction: (action: string, targetId: string, oldVal: any, newVal: any) => void;
  showToast: (msg: string) => void;
}

export const AdminOrdersTab: React.FC<AdminOrdersTabProps> = ({
  orders, onUpdateStatus, onLogAction, showToast,
}) => {
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [actingId, setActingId] = useState<string | null>(null);

  const filtered = orders.filter((o) => {
    const matchSearch = !search ||
      o.productName.toLowerCase().includes(search.toLowerCase()) ||
      o.sellerName.toLowerCase().includes(search.toLowerCase());
    const matchStatus = filterStatus === 'all' || o.status === filterStatus;
    return matchSearch && matchStatus;
  });

  const handleStatusChange = async (order: Order, newStatus: string) => {
    if (newStatus === order.status) return;
    if (!window.confirm(`Buyurtma statusini "${newStatus}" ga o'zgartirishni tasdiqlaysizmi?`)) return;
    setActingId(order.id);
    const step = ORDER_STATUSES.indexOf(newStatus) + 1;
    try {
      await adminRepository.updateOrderStatus(order.id, newStatus, step);

      await onLogAction('update_order_status', order.id, { status: order.status }, { status: newStatus });
      onUpdateStatus(order.id, newStatus, step);
      showToast(`Buyurtma holati: ${newStatus}`);
    } catch (e: any) {
      showToast(e.message || 'Xatolik yuz berdi');
    } finally {
      setActingId(null);
    }
  };

  const statusBadge = (s: string) => {
    const map: Record<string, string> = {
      'Qabul qilindi': 'bg-blue-50 text-blue-700',
      'Tasdiqlandi': 'bg-violet-50 text-violet-700',
      'Tayyorlanmoqda': 'bg-amber-50 text-amber-700',
      "Yo'lda": 'bg-cyan-50 text-cyan-700',
      'Yetkazildi': 'bg-emerald-50 text-emerald-700',
      'Bekor qilindi': 'bg-red-50 text-red-700',
    };
    return map[s] || 'bg-slate-100 text-slate-600';
  };

  return (
    <div className="space-y-4 select-none">
      <div>
        <h2 className="font-black text-xl text-[#111827]">Buyurtmalar</h2>
        <p className="text-xs text-slate-400 font-medium">{orders.length} ta buyurtma</p>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        <div className="relative flex-1 min-w-[150px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Mahsulot yoki sotuvchi..."
            className="w-full pl-9 pr-3 py-2 rounded-[14px] border border-slate-200 bg-slate-50 text-xs font-semibold outline-none focus:border-[#E53935] transition-colors"
          />
        </div>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="px-3 py-2 rounded-[14px] border border-slate-200 bg-slate-50 text-xs font-bold outline-none focus:border-[#E53935]"
        >
          <option value="all">Barcha statuslar</option>
          {ORDER_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      <div className="space-y-2">
        {filtered.length === 0 ? (
          <div className="py-10 text-center bg-white rounded-[22px] border border-slate-200/80">
            <p className="text-xs font-bold text-slate-400">Buyurtmalar topilmadi</p>
          </div>
        ) : (
          filtered.map((order) => (
            <div key={order.id} className="bg-white rounded-[20px] border border-slate-200/80 p-3.5 shadow-sm">
              <div className="flex items-start gap-3">
                <img
                  src={order.image}
                  alt={order.productName}
                  className="w-14 h-14 rounded-[14px] object-cover shrink-0 bg-slate-100"
                  onError={(e) => { (e.target as HTMLImageElement).src = 'https://placehold.co/56x56?text=IMG'; }}
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-bold text-xs text-[#111827] truncate">{order.productName}</p>
                      <p className="text-[10px] text-slate-400 font-medium">{order.sellerName} · {order.date}</p>
                      <p className="text-[10px] text-slate-500 font-medium">{order.quantity} · {order.totalPrice}</p>
                    </div>
                    <span className={`px-1.5 py-0.5 rounded-full text-[9px] font-black shrink-0 ${statusBadge(order.status)}`}>
                      {order.status}
                    </span>
                  </div>
                  <div className="mt-2">
                    <select
                      disabled={actingId === order.id}
                      value={order.status}
                      onChange={(e) => handleStatusChange(order, e.target.value)}
                      className="w-full px-2.5 py-1.5 rounded-[10px] border border-slate-200 bg-slate-50 text-[10px] font-bold outline-none focus:border-[#E53935] disabled:opacity-50"
                    >
                      {ORDER_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
