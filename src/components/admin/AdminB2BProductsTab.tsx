import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  CheckCircle2, XCircle, Search, Trash2, Eye, Package, Building2,
  MapPin, RefreshCw, X, Ban,
} from 'lucide-react';
import { b2bAdminRepository } from '../../api/b2bAdminRepository';
import { B2BProduct, B2BProductStatus } from '../../api/types';
import { formatMoney } from '../../utils/b2bUtils';

interface AdminB2BProductsTabProps {
  onLogAction: (action: string, targetId: string, oldVal: any, newVal: any) => void;
  showToast: (msg: string) => void;
}

const STATUS_TONE: Record<string, string> = {
  draft: 'bg-slate-100 text-slate-500',
  pending: 'bg-amber-50 text-amber-700',
  approved: 'bg-emerald-50 text-emerald-700',
  rejected: 'bg-rose-50 text-rose-700',
  inactive: 'bg-slate-100 text-slate-500',
};

const STATUS_LABEL: Record<string, string> = {
  draft: 'Qoralama',
  pending: 'Kutilmoqda',
  approved: 'Tasdiqlangan',
  rejected: 'Rad etilgan',
  inactive: 'Nofaol',
};

export const AdminB2BProductsTab: React.FC<AdminB2BProductsTabProps> = ({ onLogAction, showToast }) => {
  const [products, setProducts] = useState<B2BProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [selectedProduct, setSelectedProduct] = useState<B2BProduct | null>(null);

  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [actingId, setActingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await b2bAdminRepository.listAllB2BProducts();
      setProducts(data);
    } catch {
      showToast("Mahsulotlarni yuklashda xatolik");
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = useMemo(() => {
    return products.filter((p) => {
      const matchSearch =
        !search ||
        p.name.toLowerCase().includes(search.toLowerCase()) ||
        (p.supplierName || '').toLowerCase().includes(search.toLowerCase()) ||
        (p.category || '').toLowerCase().includes(search.toLowerCase());
      const matchStatus = filterStatus === 'all' || p.status === filterStatus;
      return matchSearch && matchStatus;
    });
  }, [products, search, filterStatus]);

  const handleApprove = async (p: B2BProduct) => {
    setActingId(p.id);
    try {
      await b2bAdminRepository.updateB2BProductModeration(p.id, 'approved');
      await onLogAction('approve_b2b_product', p.id, { status: p.status }, { status: 'approved' });
      setProducts((prev) => prev.map((x) => (x.id === p.id ? { ...x, status: 'approved', rejectionReason: '' } : x)));
      showToast(`«${p.name}» muvaffaqiyatli tasdiqlandi!`);
      if (selectedProduct?.id === p.id) setSelectedProduct((prev) => (prev ? { ...prev, status: 'approved' } : null));
    } catch (e: any) {
      showToast(e.message || 'Xatolik yuz berdi');
    } finally {
      setActingId(null);
    }
  };

  const handleReject = async (id: string) => {
    if (!rejectReason.trim()) {
      showToast('Rad etish sababini kiriting');
      return;
    }
    setActingId(id);
    try {
      await b2bAdminRepository.updateB2BProductModeration(id, 'rejected', rejectReason.trim());
      await onLogAction('reject_b2b_product', id, {}, { status: 'rejected', reason: rejectReason.trim() });
      setProducts((prev) =>
        prev.map((x) => (x.id === id ? { ...x, status: 'rejected', rejectionReason: rejectReason.trim() } : x))
      );
      showToast('B2B Mahsulot rad etildi');
      setRejectingId(null);
      setRejectReason('');
      if (selectedProduct?.id === id) setSelectedProduct(null);
    } catch (e: any) {
      showToast(e.message || 'Xatolik yuz berdi');
    } finally {
      setActingId(null);
    }
  };

  const handleToggleActive = async (p: B2BProduct) => {
    const nextStatus = p.status === 'inactive' ? 'approved' : 'inactive';
    setActingId(p.id);
    try {
      await b2bAdminRepository.updateB2BProductModeration(p.id, nextStatus as B2BProductStatus);
      await onLogAction('toggle_b2b_product_active', p.id, { status: p.status }, { status: nextStatus });
      setProducts((prev) => prev.map((x) => (x.id === p.id ? { ...x, status: nextStatus as B2BProductStatus } : x)));
      showToast(nextStatus === 'inactive' ? 'Mahsulot nofaol qilindi' : 'Mahsulot faollashtirildi');
      if (selectedProduct?.id === p.id) setSelectedProduct((prev) => (prev ? { ...prev, status: nextStatus as B2BProductStatus } : null));
    } catch (e: any) {
      showToast(e.message || 'Xatolik yuz berdi');
    } finally {
      setActingId(null);
    }
  };

  const handleDelete = async (p: B2BProduct) => {
    if (!window.confirm(`«${p.name}» mahsulotini o'chirishni tasdiqlaysizmi?`)) return;
    setActingId(p.id);
    try {
      await b2bAdminRepository.deleteB2BProductByAdmin(p.id);
      await onLogAction('delete_b2b_product', p.id, { name: p.name }, null);
      setProducts((prev) => prev.filter((x) => x.id !== p.id));
      showToast("B2B Mahsulot o'chirildi");
      if (selectedProduct?.id === p.id) setSelectedProduct(null);
    } catch (e: any) {
      showToast(e.message || 'Xatolik yuz berdi');
    } finally {
      setActingId(null);
    }
  };

  const pendingCount = products.filter((p) => p.status === 'pending').length;

  return (
    <div className="space-y-4 select-none">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h2 className="font-black text-xl text-[#111827]">B2B Ulgurji Mahsulotlar (Katalog)</h2>
          <p className="text-xs text-slate-400 font-medium">
            {products.length} ta mahsulot · {pendingCount} ta tasdiq kutilmoqda
          </p>
        </div>
        <button
          onClick={load}
          className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors cursor-pointer"
          title="Yangilash"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Search & Status Filters */}
      <div className="space-y-2">
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Mahsulot nomi, ta'minotchi yoki kategoriya..."
            className="w-full bg-white border border-slate-200 rounded-2xl pl-10 pr-4 py-2.5 text-xs font-medium outline-none focus:border-[#D84315] shadow-xs"
          />
        </div>

        <div className="flex gap-1.5 overflow-x-auto no-scrollbar py-0.5">
          {[
            { id: 'all', label: 'Barchasi', count: products.length },
            { id: 'pending', label: 'Kutilmoqda', count: pendingCount },
            { id: 'approved', label: 'Tasdiqlangan', count: products.filter((p) => p.status === 'approved').length },
            { id: 'rejected', label: 'Rad etilgan', count: products.filter((p) => p.status === 'rejected').length },
            { id: 'inactive', label: 'Nofaol', count: products.filter((p) => p.status === 'inactive').length },
          ].map((s) => (
            <button
              key={s.id}
              onClick={() => setFilterStatus(s.id)}
              className={`px-3 py-1.5 rounded-full text-xs font-bold shrink-0 transition-all cursor-pointer ${
                filterStatus === s.id
                  ? 'bg-[#111827] text-white shadow-xs'
                  : 'bg-white border border-slate-200/80 text-slate-600 hover:bg-slate-100'
              }`}
            >
              {s.label} ({s.count})
            </button>
          ))}
        </div>
      </div>

      {/* Products List */}
      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-24 rounded-2xl bg-slate-100 animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="py-14 text-center bg-white rounded-2xl border border-slate-200/80">
          <Package className="w-8 h-8 mx-auto text-slate-300 mb-1.5" />
          <p className="text-xs font-bold text-slate-400">B2B mahsulotlar topilmadi</p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {filtered.map((p) => {
            const mainImg = p.images?.[0] || '/logo.png';

            return (
              <div
                key={p.id}
                className="bg-white rounded-2xl border border-slate-200/80 p-3.5 shadow-xs space-y-2.5 transition-all hover:border-slate-300"
              >
                <div className="flex items-center justify-between gap-3">
                  {/* Image & Main Info */}
                  <div className="flex items-center gap-3 min-w-0">
                    <img
                      src={mainImg}
                      alt={p.name}
                      className="w-14 h-14 rounded-xl object-cover bg-slate-100 shrink-0 border border-slate-100"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = 'https://placehold.co/56x56?text=B2B';
                      }}
                    />
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <p className="text-xs font-black text-slate-900 truncate">{p.name}</p>
                        <span className={`px-2 py-0.2 rounded-full text-[9px] font-black shrink-0 ${STATUS_TONE[p.status]}`}>
                          {STATUS_LABEL[p.status]}
                        </span>
                      </div>

                      <p className="text-[11px] text-slate-400 font-medium flex items-center gap-1 mt-0.5 truncate">
                        <Building2 className="w-3 h-3 text-slate-400 shrink-0" />
                        <span className="font-bold text-slate-600">{p.supplierName || 'Ta\'minotchi'}</span>
                        <span>·</span>
                        <span>{p.category}</span>
                      </p>

                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs font-black text-[#D84315]">{formatMoney(p.wholesalePrice)}</span>
                        <span className="text-[10px] text-slate-400 font-semibold">/ {p.unit}</span>
                        <span className="text-[10px] text-slate-500 font-bold bg-slate-100 px-1.5 py-0.2 rounded-md">
                          MOQ: {p.moq} {p.unit}
                        </span>
                        <span className="text-[10px] text-emerald-700 font-bold bg-emerald-50 px-1.5 py-0.2 rounded-md">
                          Zaxira: {p.availableQty} {p.unit}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => setSelectedProduct(p)}
                      className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer"
                      title="Batafsil ko'rish"
                    >
                      <Eye className="w-4 h-4" />
                    </button>

                    {p.status === 'pending' && (
                      <>
                        <button
                          disabled={actingId === p.id}
                          onClick={() => handleApprove(p)}
                          className="p-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-600 transition-colors disabled:opacity-50 cursor-pointer"
                          title="Tasdiqlash"
                        >
                          <CheckCircle2 className="w-4 h-4" />
                        </button>
                        <button
                          disabled={actingId === p.id}
                          onClick={() => setRejectingId(p.id)}
                          className="p-2 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-600 transition-colors disabled:opacity-50 cursor-pointer"
                          title="Rad etish"
                        >
                          <XCircle className="w-4 h-4" />
                        </button>
                      </>
                    )}

                    <button
                      disabled={actingId === p.id}
                      onClick={() => handleToggleActive(p)}
                      className={`p-2 rounded-xl transition-colors disabled:opacity-50 cursor-pointer ${
                        p.status === 'inactive'
                          ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                      title={p.status === 'inactive' ? 'Faollashtirish' : 'Nofaol qilish'}
                    >
                      <Ban className="w-4 h-4" />
                    </button>

                    <button
                      disabled={actingId === p.id}
                      onClick={() => handleDelete(p)}
                      className="p-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-600 transition-colors disabled:opacity-50 cursor-pointer"
                      title="O'chirish"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Reject Input Accordion */}
                {rejectingId === p.id && (
                  <div className="flex items-center gap-2 pt-2 border-t border-slate-100 animate-fade-in">
                    <input
                      value={rejectReason}
                      onChange={(e) => setRejectReason(e.target.value)}
                      placeholder="Rad etish sababi (masalan: sertifikat yetarli emas)..."
                      className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium outline-none focus:border-[#D84315]"
                    />
                    <button
                      onClick={() => handleReject(p.id)}
                      className="px-3.5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-black cursor-pointer"
                    >
                      Tasdiqlash
                    </button>
                    <button
                      onClick={() => {
                        setRejectingId(null);
                        setRejectReason('');
                      }}
                      className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold cursor-pointer"
                    >
                      Bekor
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Product Full Details Modal */}
      {selectedProduct && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white w-full max-w-lg rounded-[24px] shadow-2xl border border-slate-200 overflow-hidden max-h-[90vh] flex flex-col">
            {/* Header */}
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="font-black text-base text-slate-900">{selectedProduct.name}</h3>
                <p className="text-[11px] text-slate-400 font-medium">B2B Ulgurji mahsulot kartochkasi</p>
              </div>
              <button
                onClick={() => setSelectedProduct(null)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-600 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Body */}
            <div className="p-4 overflow-y-auto space-y-4 text-xs">
              {/* Images Carousel */}
              {selectedProduct.images && selectedProduct.images.length > 0 && (
                <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
                  {selectedProduct.images.map((img, idx) => (
                    <img
                      key={idx}
                      src={img}
                      alt={selectedProduct.name}
                      className="w-28 h-28 rounded-2xl object-cover bg-slate-100 shrink-0 border border-slate-200"
                    />
                  ))}
                </div>
              )}

              {/* Status & Supplier */}
              <div className="grid grid-cols-2 gap-2">
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                  <span className="text-[10px] text-slate-400 font-bold block">Holati:</span>
                  <span className={`inline-block mt-1 px-2.5 py-0.5 rounded-full text-xs font-black ${STATUS_TONE[selectedProduct.status]}`}>
                    {STATUS_LABEL[selectedProduct.status]}
                  </span>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                  <span className="text-[10px] text-slate-400 font-bold block">Ishlab chiqaruvchi:</span>
                  <span className="font-black text-slate-900 text-xs mt-1 block truncate">
                    {selectedProduct.supplierName || 'Ta\'minotchi'}
                  </span>
                </div>
              </div>

              {/* Price & MOQ */}
              <div className="grid grid-cols-3 gap-2 bg-orange-50/50 p-3 rounded-2xl border border-orange-100">
                <div>
                  <span className="text-[10px] text-slate-400 font-bold block">Ulgurji narx:</span>
                  <span className="text-sm font-black text-[#D84315] block mt-0.5">
                    {formatMoney(selectedProduct.wholesalePrice)}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 font-bold block">Minimal partiya (MOQ):</span>
                  <span className="text-xs font-black text-slate-900 block mt-0.5">
                    {selectedProduct.moq} {selectedProduct.unit}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 font-bold block">Ombordagi zaxira:</span>
                  <span className="text-xs font-black text-emerald-700 block mt-0.5">
                    {selectedProduct.availableQty} {selectedProduct.unit}
                  </span>
                </div>
              </div>

              {/* Description */}
              {selectedProduct.description && (
                <div className="space-y-1">
                  <span className="font-bold text-slate-700 block">Mahsulot tavsifi:</span>
                  <p className="p-3 rounded-xl bg-slate-50 text-slate-600 text-xs leading-relaxed border border-slate-100">
                    {selectedProduct.description}
                  </p>
                </div>
              )}

              {/* Regions & Delivery */}
              {selectedProduct.deliveryRegions && selectedProduct.deliveryRegions.length > 0 && (
                <div className="space-y-1">
                  <span className="font-bold text-slate-700 block">Yetkazib berish hududlari:</span>
                  <div className="flex flex-wrap gap-1.5">
                    {selectedProduct.deliveryRegions.map((reg, i) => (
                      <span key={i} className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 text-[11px] font-semibold flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-[#D84315]" />
                        {reg}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Footer Actions */}
            <div className="p-3 border-t border-slate-100 flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5">
                {selectedProduct.status === 'pending' && (
                  <button
                    onClick={() => handleApprove(selectedProduct)}
                    className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs cursor-pointer"
                  >
                    Tasdiqlash
                  </button>
                )}
                <button
                  onClick={() => handleToggleActive(selectedProduct)}
                  className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs cursor-pointer"
                >
                  {selectedProduct.status === 'inactive' ? 'Faollashtirish' : 'Nofaol qilish'}
                </button>
              </div>

              <button
                onClick={() => setSelectedProduct(null)}
                className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs cursor-pointer"
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
