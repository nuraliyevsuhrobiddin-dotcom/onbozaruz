import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  Search,
  Store,
  Building2,
  Package,
  Clock,
  CheckCircle2,
  Truck,
  XCircle,
  Phone,
  MapPin,
  FileText,
  ChevronDown,
  ChevronUp,
  CreditCard,
  RefreshCw,
  Eye,
  Percent,
  Calendar,
  X,
} from 'lucide-react';
import { b2bAdminRepository } from '../../api/b2bAdminRepository';
import { B2BOrder, B2BOrderStatus } from '../../api/types';
import {
  formatMoney,
  B2B_ORDER_STATUS_LABEL as STATUS_LABEL,
  B2B_ORDER_STATUS_TONE as STATUS_TONE,
} from '../../utils/b2bUtils';

export const AdminB2BOrdersTab: React.FC<{ showToast: (msg: string) => void }> = ({ showToast }) => {
  const [orders, setOrders] = useState<B2BOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);
  const [selectedOrderDetail, setSelectedOrderDetail] = useState<B2BOrder | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await b2bAdminRepository.listAllB2BOrders();
      setOrders(data);
    } catch {
      showToast("Buyurtmalarni yuklashda xatolik yuz berdi");
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = useMemo(() => {
    return orders.filter((o) => {
      // Status filter
      if (statusFilter !== 'all' && o.status !== statusFilter) return false;

      // Search filter
      if (!search.trim()) return true;
      const q = search.toLowerCase();
      const matchOrderNum = (o.orderNumber || '').toLowerCase().includes(q);
      const matchSupplier = (o.supplierName || '').toLowerCase().includes(q);
      const matchBusiness = (o.businessName || o.deliveryStoreName || '').toLowerCase().includes(q);
      const matchPhone = (o.deliveryPhone || '').toLowerCase().includes(q);
      const matchAddress = (o.deliveryAddress || o.deliveryRegion || '').toLowerCase().includes(q);
      const matchItems = (o.items || []).some((item) => (item.productName || '').toLowerCase().includes(q));

      return matchOrderNum || matchSupplier || matchBusiness || matchPhone || matchAddress || matchItems;
    });
  }, [orders, statusFilter, search]);

  const totalVolume = useMemo(() => orders.reduce((sum, o) => sum + (o.total || 0), 0), [orders]);
  const totalCommission = useMemo(() => orders.reduce((sum, o) => sum + (o.commissionAmount || 0), 0), [orders]);

  const toggleExpand = (id: string) => {
    setExpandedOrderId((prev) => (prev === id ? null : id));
  };

  return (
    <div className="space-y-4 select-none">
      {/* Header & Stats */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="font-black text-xl text-[#111827]">B2B Ulgurji Buyurtmalar</h2>
          <p className="text-xs text-slate-500 font-medium">
            Qaysi do'kon qaysi ishlab chiqaruvchidan qanday mahsulotlar xarid qilganini to'liq nazorat qilish
          </p>
        </div>
        <button
          onClick={load}
          disabled={loading}
          className="self-start sm:self-auto px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Yangilash</span>
        </button>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        <div className="bg-white rounded-2xl border border-slate-200/80 p-3 shadow-xs">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Jami buyurtmalar</span>
          <span className="text-lg font-black text-slate-900 mt-0.5 block">{orders.length} ta</span>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200/80 p-3 shadow-xs">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Umumiy aylanma</span>
          <span className="text-lg font-black text-[#D84315] mt-0.5 block">{formatMoney(totalVolume)}</span>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200/80 p-3 shadow-xs">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Platforma komissiyasi</span>
          <span className="text-lg font-black text-emerald-600 mt-0.5 block">{formatMoney(totalCommission)}</span>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200/80 p-3 shadow-xs">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Yetkazilgan</span>
          <span className="text-lg font-black text-blue-600 mt-0.5 block">
            {orders.filter((o) => o.status === 'delivered').length} ta
          </span>
        </div>
      </div>

      {/* Search & Status Filters */}
      <div className="space-y-2">
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Do'kon nomi, ishlab chiqaruvchi, mahsulot yoki buyurtma raqami..."
            className="w-full bg-white border border-slate-200/80 rounded-2xl pl-10 pr-4 py-2.5 text-xs font-medium outline-none focus:border-[#D84315] shadow-xs"
          />
        </div>

        {/* Scrollable Status Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1">
          {[
            { id: 'all', label: 'Barchasi', count: orders.length },
            { id: 'pending', label: 'Kutilmoqda', count: orders.filter((o) => o.status === 'pending').length },
            { id: 'supplier_confirmed', label: 'Tasdiqlangan', count: orders.filter((o) => o.status === 'supplier_confirmed').length },
            { id: 'preparing', label: 'Tayyorlanmoqda', count: orders.filter((o) => o.status === 'preparing').length },
            { id: 'delivering', label: 'Yetkazilmoqda', count: orders.filter((o) => o.status === 'delivering').length },
            { id: 'delivered', label: 'Yetkazildi', count: orders.filter((o) => o.status === 'delivered').length },
            { id: 'cancelled', label: 'Bekor qilingan', count: orders.filter((o) => o.status === 'cancelled').length },
          ].map((pill) => (
            <button
              key={pill.id}
              type="button"
              onClick={() => setStatusFilter(pill.id)}
              className={`px-3 py-1.5 rounded-full text-xs font-bold shrink-0 transition-all cursor-pointer ${
                statusFilter === pill.id
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-white border border-slate-200/80 text-slate-600 hover:bg-slate-50'
              }`}
            >
              {pill.label} ({pill.count})
            </button>
          ))}
        </div>
      </div>

      {/* Orders List */}
      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-28 rounded-2xl bg-slate-100 animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200/80 p-12 text-center space-y-2">
          <Package className="w-8 h-8 mx-auto text-slate-300" />
          <h4 className="text-sm font-black text-slate-800">Buyurtmalar topilmadi</h4>
          <p className="text-xs text-slate-400 max-w-xs mx-auto font-medium">
            Qidiruv so'zini o'zgartiring yoki filtrlarni tozalang.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((order) => {
            const isExpanded = expandedOrderId === order.id;
            const items = order.items || [];
            const storeName = order.businessName || order.deliveryStoreName || "Noma'lum do'kon";
            const supplierName = order.supplierName || "Noma'lum ishlab chiqaruvchi";

            return (
              <div
                key={order.id}
                className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden transition-all hover:border-slate-300"
              >
                {/* Order Top Card Header */}
                <div className="p-3.5 space-y-3">
                  {/* Top Bar: Order number, date, and status badge */}
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-2">
                      <span className="font-black text-xs text-slate-900 bg-slate-100 px-2 py-0.5 rounded-md">
                        {order.orderNumber}
                      </span>
                      <span className="text-[11px] text-slate-400 font-medium flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {new Date(order.createdAt).toLocaleDateString('uz-UZ', {
                          day: '2-digit',
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>

                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black ${STATUS_TONE[order.status]}`}>
                      {STATUS_LABEL[order.status]}
                    </span>
                  </div>

                  {/* Flow Details: Do'kon (Xaridor) -> Ishlab Chiqaruvchi (Ta'minotchi) */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1 bg-slate-50/70 p-3 rounded-xl border border-slate-100">
                    {/* Buyer Store Details */}
                    <div className="flex items-start gap-2.5 min-w-0">
                      <div className="w-8 h-8 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center shrink-0 mt-0.5">
                        <Store className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <span className="text-[10px] font-black text-blue-600 uppercase tracking-wider block">
                          Xaridor Do'kon
                        </span>
                        <p className="font-black text-xs text-slate-900 truncate">{storeName}</p>
                        {order.deliveryPhone && (
                          <p className="text-[11px] text-slate-500 font-semibold flex items-center gap-1 mt-0.5">
                            <Phone className="w-3 h-3 text-slate-400" />
                            {order.deliveryPhone}
                          </p>
                        )}
                        {(order.deliveryRegion || order.deliveryAddress) && (
                          <p className="text-[10px] text-slate-400 truncate flex items-center gap-1 mt-0.5">
                            <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                            {[order.deliveryRegion, order.deliveryDistrict, order.deliveryAddress].filter(Boolean).join(', ')}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Supplier / Manufacturer Details */}
                    <div className="flex items-start gap-2.5 min-w-0">
                      <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 mt-0.5">
                        <Building2 className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <span className="text-[10px] font-black text-emerald-600 uppercase tracking-wider block">
                          Ishlab Chiqaruvchi / Ta'minotchi
                        </span>
                        <p className="font-black text-xs text-slate-900 truncate">{supplierName}</p>
                        <p className="text-[11px] text-slate-500 font-semibold mt-0.5">
                          Komissiya: <span className="text-emerald-700 font-black">{order.commissionRate}%</span> ({formatMoney(order.commissionAmount)})
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Summary Bottom Bar with Amount & Items Count */}
                  <div className="flex items-center justify-between pt-1 border-t border-slate-100">
                    <div className="flex items-center gap-3">
                      <div>
                        <span className="text-[10px] text-slate-400 font-bold block">Jami summa</span>
                        <span className="text-sm font-black text-[#D84315]">{formatMoney(order.total)}</span>
                      </div>
                      {order.deliveryFee > 0 && (
                        <div className="hidden sm:block">
                          <span className="text-[10px] text-slate-400 font-bold block">Yetkazish</span>
                          <span className="text-xs font-extrabold text-slate-700">{formatMoney(order.deliveryFee)}</span>
                        </div>
                      )}
                      {order.cashbackUsed > 0 && (
                        <div className="hidden sm:block">
                          <span className="text-[10px] text-slate-400 font-bold block">Keshbek ishlatildi</span>
                          <span className="text-xs font-extrabold text-amber-600">-{formatMoney(order.cashbackUsed)}</span>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setSelectedOrderDetail(order)}
                        className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-black transition-colors flex items-center gap-1 cursor-pointer"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Batafsil</span>
                      </button>

                      {items.length > 0 && (
                        <button
                          type="button"
                          onClick={() => toggleExpand(order.id)}
                          className="px-3 py-1.5 rounded-xl bg-orange-50 hover:bg-orange-100 text-[#D84315] text-xs font-black transition-colors flex items-center gap-1 cursor-pointer"
                        >
                          <Package className="w-3.5 h-3.5" />
                          <span>Mahsulotlar ({items.length})</span>
                          {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Expanded Products Items List */}
                {isExpanded && items.length > 0 && (
                  <div className="bg-slate-50 border-t border-slate-200/80 p-3 space-y-2">
                    <span className="text-[11px] font-black text-slate-700 uppercase tracking-wider block">
                      Xarid qilingan mahsulotlar ro'yxati ({items.length} xil):
                    </span>
                    <div className="space-y-1.5">
                      {items.map((item, idx) => (
                        <div
                          key={item.id || idx}
                          className="bg-white rounded-xl p-2.5 border border-slate-200/60 flex items-center justify-between gap-3 text-xs"
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className="w-10 h-10 rounded-lg bg-slate-100 overflow-hidden shrink-0">
                              {item.productImage ? (
                                <img src={item.productImage} alt={item.productName} className="w-full h-full object-cover" />
                              ) : (
                                <Package className="w-5 h-5 m-2.5 text-slate-400" />
                              )}
                            </div>
                            <div className="min-w-0">
                              <p className="font-black text-slate-900 truncate">{item.productName}</p>
                              <p className="text-[11px] text-slate-500 font-semibold">
                                {item.quantity} {item.unit} × {formatMoney(item.unitPrice)}
                              </p>
                            </div>
                          </div>

                          <span className="font-black text-slate-900 shrink-0">
                            {formatMoney(item.lineTotal || item.quantity * item.unitPrice)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Full Order Detail Modal */}
      {selectedOrderDetail && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white w-full max-w-lg rounded-[24px] shadow-2xl border border-slate-200 overflow-hidden max-h-[90vh] flex flex-col">
            {/* Modal Header */}
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="font-black text-base text-slate-900">
                  Buyurtma: {selectedOrderDetail.orderNumber}
                </h3>
                <p className="text-[11px] text-slate-400 font-medium">
                  {new Date(selectedOrderDetail.createdAt).toLocaleString('uz-UZ')}
                </p>
              </div>
              <button
                onClick={() => setSelectedOrderDetail(null)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-600 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-4 overflow-y-auto space-y-4 text-xs">
              {/* Status */}
              <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 border border-slate-200/80">
                <span className="font-bold text-slate-600">Buyurtma holati:</span>
                <span className={`px-3 py-1 rounded-full text-xs font-black ${STATUS_TONE[selectedOrderDetail.status]}`}>
                  {STATUS_LABEL[selectedOrderDetail.status]}
                </span>
              </div>

              {/* Store & Supplier Blocks */}
              <div className="space-y-2">
                <div className="p-3 rounded-2xl border border-blue-100 bg-blue-50/50 space-y-1">
                  <div className="flex items-center gap-1.5 text-blue-800 font-black text-xs">
                    <Store className="w-4 h-4" />
                    <span>Xaridor do'kon ma'lumotlari</span>
                  </div>
                  <p className="font-extrabold text-slate-900 text-sm">
                    {selectedOrderDetail.businessName || selectedOrderDetail.deliveryStoreName || "Noma'lum do'kon"}
                  </p>
                  {selectedOrderDetail.deliveryPhone && (
                    <p className="text-slate-600 font-medium flex items-center gap-1">
                      <Phone className="w-3.5 h-3.5 text-slate-400" />
                      {selectedOrderDetail.deliveryPhone}
                    </p>
                  )}
                  {selectedOrderDetail.deliveryAddress && (
                    <p className="text-slate-600 font-medium flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 text-slate-400" />
                      {[selectedOrderDetail.deliveryRegion, selectedOrderDetail.deliveryDistrict, selectedOrderDetail.deliveryAddress]
                        .filter(Boolean)
                        .join(', ')}
                    </p>
                  )}
                  {selectedOrderDetail.deliveryNote && (
                    <p className="text-slate-500 italic text-[11px] pt-1">
                      Izoh: "{selectedOrderDetail.deliveryNote}"
                    </p>
                  )}
                </div>

                <div className="p-3 rounded-2xl border border-emerald-100 bg-emerald-50/50 space-y-1">
                  <div className="flex items-center gap-1.5 text-emerald-800 font-black text-xs">
                    <Building2 className="w-4 h-4" />
                    <span>Ishlab chiqaruvchi / Ta'minotchi</span>
                  </div>
                  <p className="font-extrabold text-slate-900 text-sm">
                    {selectedOrderDetail.supplierName || "Noma'lum ta'minotchi"}
                  </p>
                  <p className="text-slate-600 font-medium">
                    Platforma komissiyasi: <span className="font-black text-emerald-700">{selectedOrderDetail.commissionRate}%</span> ({formatMoney(selectedOrderDetail.commissionAmount)})
                  </p>
                  <p className="text-slate-600 font-medium">
                    Ta'minotchiga to'lanadigan summa: <span className="font-black text-slate-900">{formatMoney(selectedOrderDetail.supplierAmount || (selectedOrderDetail.total - selectedOrderDetail.commissionAmount))}</span>
                  </p>
                </div>
              </div>

              {/* Products Breakdown */}
              <div className="space-y-2">
                <span className="font-black text-slate-900 block">Xarid qilingan mahsulotlar:</span>
                <div className="space-y-1.5">
                  {(selectedOrderDetail.items || []).map((item, i) => (
                    <div key={i} className="p-2.5 rounded-xl border border-slate-200 bg-white flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-black text-slate-900 truncate">{item.productName}</p>
                        <p className="text-[11px] text-slate-500 font-medium">
                          {item.quantity} {item.unit} × {formatMoney(item.unitPrice)}
                        </p>
                      </div>
                      <span className="font-black text-slate-900 shrink-0">
                        {formatMoney(item.lineTotal || item.quantity * item.unitPrice)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Payment & Totals */}
              <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-1.5">
                <div className="flex justify-between text-slate-600">
                  <span>Mahsulotlar summasi:</span>
                  <span className="font-bold text-slate-900">{formatMoney(selectedOrderDetail.subtotal || selectedOrderDetail.total)}</span>
                </div>
                {selectedOrderDetail.deliveryFee > 0 && (
                  <div className="flex justify-between text-slate-600">
                    <span>Yetkazib berish haqi:</span>
                    <span className="font-bold text-slate-900">{formatMoney(selectedOrderDetail.deliveryFee)}</span>
                  </div>
                )}
                {selectedOrderDetail.cashbackUsed > 0 && (
                  <div className="flex justify-between text-amber-600">
                    <span>Ishlatilgan keshbek:</span>
                    <span className="font-black">-{formatMoney(selectedOrderDetail.cashbackUsed)}</span>
                  </div>
                )}
                <div className="pt-1.5 border-t border-slate-200 flex justify-between items-center">
                  <span className="font-black text-slate-900 text-sm">Jami to'lov:</span>
                  <span className="font-black text-[#D84315] text-base">{formatMoney(selectedOrderDetail.total)}</span>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-3 border-t border-slate-100 flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedOrderDetail(null)}
                className="px-5 py-2 rounded-xl bg-slate-900 text-white font-black text-xs cursor-pointer hover:bg-slate-800 transition-colors"
              >
                Yopish
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
