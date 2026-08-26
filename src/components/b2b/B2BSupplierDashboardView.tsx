import React, { useEffect, useState } from 'react';
import { ArrowLeft, Plus, X, Loader2, Package, ShoppingCart, TrendingUp, Upload, MapPin, Phone, Store } from 'lucide-react';
import { useAgroStore } from '../../store/useAgroStore';
import { categoriesForScope } from '../../utils/categoryScope';
import { REGIONS } from '../../data/mockAgroData';
import { uploadListingMedia } from '../../api/authClient';
import { B2BOrder } from '../../api/types';
import {
  formatMoney,
  B2B_ORDER_STATUS_LABEL as STATUS_LABEL,
  B2B_NEXT_ORDER_STATUS as NEXT_STATUS,
} from '../../utils/b2bUtils';

type Tab = 'products' | 'orders';

export const B2BSupplierDashboardView: React.FC = () => {
  const {
    setB2BRoute, supplierProfile, ownB2BProducts, fetchOwnB2BProducts, submitB2BProduct,
    supplierB2BOrders, fetchSupplierB2BOrders, supplierUpdateB2BOrderStatus, supplierConfirmB2BCashPayment,
    b2bContract, fetchOwnB2BContract, categories: allCategories, showToast,
  } = useAgroStore();
  const categories = categoriesForScope(allCategories, 'market').filter((c) => c.id !== 'all');

  const [tab, setTab] = useState<Tab>('orders');
  const [isContractChecked, setIsContractChecked] = useState(false);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [rejectingOrderId, setRejectingOrderId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  const [form, setForm] = useState({
    name: '', brand: '', category: '', description: '', sku: '',
    wholesalePrice: '', moq: '1', availableQty: '', unit: 'dona', packaging: '',
    deliveryAvailable: false, deliveryRegions: [] as string[],
  });
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);

  useEffect(() => {
    if (supplierProfile?.verificationStatus === 'approved') {
      void fetchOwnB2BContract().finally(() => setIsContractChecked(true));
      void fetchOwnB2BProducts();
      void fetchSupplierB2BOrders();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [supplierProfile?.id, supplierProfile?.verificationStatus]);

  if (!supplierProfile) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center px-4">
        <div className="w-full max-w-lg py-16 px-4 text-center space-y-4 bg-white rounded-3xl border border-slate-200">
          <p className="text-sm font-bold text-slate-600">Sizda hali supplier profili yo'q.</p>
          <button
            onClick={() => setB2BRoute({ view: 'business' })}
            className="px-6 py-3.5 rounded-2xl bg-blue-500 hover:bg-blue-600 text-white font-black text-sm shadow-lg shadow-blue-500/25 transition-all border border-blue-400/30"
          >
            Supplier sifatida qo'shilish
          </button>
        </div>
      </div>
    );
  }

  if (supplierProfile.verificationStatus === 'pending') {
    return (
      <div className="min-h-[70vh] flex items-center justify-center px-4">
        <div className="w-full max-w-lg py-16 px-4 text-center space-y-3 bg-white rounded-3xl border border-slate-200">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600 text-2xl">⏳</div>
          <p className="text-sm font-black text-slate-900">Arizangiz ko'rib chiqilmoqda</p>
          <p className="text-xs text-slate-500">Admin tasdiqlagach mahsulot joylashtirishingiz mumkin bo'ladi.</p>
        </div>
      </div>
    );
  }
  if (supplierProfile.verificationStatus === 'rejected' || supplierProfile.verificationStatus === 'suspended') {
    return (
      <div className="min-h-[70vh] flex items-center justify-center px-4">
        <div className="w-full max-w-lg py-16 px-4 text-center space-y-3 bg-white rounded-3xl border border-slate-200">
          <p className="text-sm font-black text-red-600">
            {supplierProfile.verificationStatus === 'rejected' ? 'Ariza rad etildi' : 'Akkaunt to\'xtatilgan'}
          </p>
          {supplierProfile.rejectionReason && <p className="text-xs text-slate-500">{supplierProfile.rejectionReason}</p>}
        </div>
      </div>
    );
  }

  if (!isContractChecked) {
    return (
      <div className="w-full max-w-170 mx-auto py-16 flex flex-col items-center justify-center gap-3">
        <Loader2 className="w-6 h-6 text-blue-400 animate-spin" />
        <span className="text-xs text-slate-500 font-medium">Yuklanmoqda...</span>
      </div>
    );
  }

  if (b2bContract?.status !== 'accepted') {
    return (
      <div className="min-h-[70vh] flex items-center justify-center px-4">
        <div className="w-full max-w-lg py-16 px-4 text-center space-y-4 bg-white rounded-3xl border border-slate-200">
        <p className="text-sm font-bold text-slate-600">Mahsulot joylashtirishdan oldin hamkorlik shartnomasini ko'rib chiqing.</p>
        <button
          onClick={() => setB2BRoute({ view: 'contracts' })}
          className="px-6 py-3.5 rounded-2xl bg-blue-500 hover:bg-blue-600 text-white font-black text-sm shadow-lg shadow-blue-500/25 transition-all border border-blue-400/30"
        >
          Shartnomani ko'rish
        </button>
        </div>
      </div>
    );
  }

  const handleFileSelect = (files: FileList | null) => {
    if (!files) return;
    const arr = Array.from(files).slice(0, 5);
    setSelectedFiles(arr);
    setPreviewUrls(arr.map((f) => URL.createObjectURL(f)));
  };

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.category || !form.wholesalePrice || selectedFiles.length === 0) {
      showToast("Nomi, kategoriya, narx va kamida bitta rasm kerak");
      return;
    }
    setIsSubmitting(true);
    try {
      const images = await Promise.all(
        selectedFiles.map((file, idx) => uploadListingMedia(file, `${supplierProfile.userId}/b2b-${Date.now()}-${idx}.jpg`, file.type))
      );
      await submitB2BProduct({
        supplierId: supplierProfile.id,
        name: form.name.trim(),
        brand: form.brand.trim(),
        category: form.category,
        description: form.description.trim(),
        sku: form.sku.trim(),
        images,
        videoUrl: '',
        wholesalePrice: Number(form.wholesalePrice),
        moq: Math.max(1, Number(form.moq) || 1),
        availableQty: Math.max(0, Number(form.availableQty) || 0),
        unit: form.unit || 'dona',
        packaging: form.packaging.trim(),
        deliveryAvailable: form.deliveryAvailable,
        deliveryRegions: form.deliveryRegions,
      });
      setIsAddOpen(false);
      setForm({ name: '', brand: '', category: '', description: '', sku: '', wholesalePrice: '', moq: '1', availableQty: '', unit: 'dona', packaging: '', deliveryAvailable: false, deliveryRegions: [] });
      setSelectedFiles([]);
      setPreviewUrls([]);
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Mahsulot qo'shilmadi");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAdvanceStatus = (order: B2BOrder) => {
    const next = NEXT_STATUS[order.status];
    if (!next) return;
    void supplierUpdateB2BOrderStatus(order.id, next);
  };

  const handleReject = (orderId: string) => {
    if (!rejectReason.trim()) { showToast('Rad etish sababini kiriting'); return; }
    void supplierUpdateB2BOrderStatus(orderId, 'rejected', rejectReason.trim());
    setRejectingOrderId(null);
    setRejectReason('');
  };

  const inputCls = "w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-bold text-slate-800 placeholder:text-slate-400 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-500/30";

  return (
    <div className="w-full max-w-170 mx-auto py-3 px-3 space-y-4 select-none pb-20">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => setB2BRoute({ view: 'home' })}
          className="p-2 rounded-xl bg-white hover:bg-slate-50 text-slate-600 hover:text-slate-900 transition-colors border border-slate-200"
        >
          <ArrowLeft className="w-4.5 h-4.5" />
        </button>
        <div>
          <h1 className="font-black text-lg text-slate-900">{supplierProfile.companyName}</h1>
          <p className="text-[11px] text-emerald-600 font-bold flex items-center gap-1">
            <span>✓</span> Tasdiqlangan supplier
          </p>
        </div>
        <button
          onClick={() => setB2BRoute({ view: 'finance' })}
          className="ml-auto p-2.5 rounded-xl bg-white hover:bg-slate-50 text-slate-600 border border-slate-200 transition-colors"
          title="Moliya"
        >
          <TrendingUp className="w-4 h-4 text-blue-500" />
        </button>
      </div>

      {/* Tabs */}
      <div className="inline-flex p-1 bg-white border border-slate-200 rounded-2xl gap-1">
        <button
          onClick={() => setTab('orders')}
          className={`px-4 py-2 rounded-xl text-xs font-black transition-all ${
            tab === 'orders'
              ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/25'
              : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          <ShoppingCart className="w-3.5 h-3.5 inline mr-1.5" /> Buyurtmalar ({supplierB2BOrders.length})
        </button>
        <button
          onClick={() => setTab('products')}
          className={`px-4 py-2 rounded-xl text-xs font-black transition-all ${
            tab === 'products'
              ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/25'
              : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          <Package className="w-3.5 h-3.5 inline mr-1.5" /> Mahsulotlar ({ownB2BProducts.length})
        </button>
      </div>

      {tab === 'orders' ? (
        supplierB2BOrders.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-2xl border border-slate-200 space-y-2">
            <ShoppingCart className="w-8 h-8 mx-auto text-slate-300" />
            <p className="text-xs font-bold text-slate-500">Hozircha buyurtmalar mavjud emas.</p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {supplierB2BOrders.map((order) => (
              <div key={order.id} className="bg-white rounded-2xl border border-slate-200 p-4 space-y-3 shadow-xs hover:border-slate-300 transition-all">
                {/* Header: Order number and status */}
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <span className="font-black text-xs text-slate-900">{order.orderNumber}</span>
                    <span className="block text-[10px] text-slate-500 font-medium mt-0.5">
                      {new Date(order.createdAt).toLocaleString('uz-UZ')}
                    </span>
                  </div>
                  <span className="px-2.5 py-1 rounded-full bg-slate-100 border border-slate-200 text-[10px] font-black text-slate-600">
                    {STATUS_LABEL[order.status] || order.status}
                  </span>
                </div>

                {/* Buyer & Store Info */}
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 space-y-1.5 text-xs">
                  <div className="flex items-center gap-1.5 font-bold text-slate-800">
                    <Store className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                    <span>{order.deliveryStoreName || order.businessName || "Do'kon"}</span>
                  </div>

                  {/* Delivery Address */}
                  <div className="flex items-start gap-1.5 text-slate-500 text-[11px]">
                    <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                    <span>
                      {[order.deliveryRegion, order.deliveryDistrict, order.deliveryAddress].filter(Boolean).join(', ') || "Manzil ko'rsatilmagan"}
                    </span>
                  </div>

                  {/* Phone */}
                  {order.deliveryPhone && (
                    <div className="flex items-center gap-1.5 pt-0.5">
                      <Phone className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      <a href={`tel:${order.deliveryPhone}`} className="text-emerald-600 font-black hover:underline">
                        {order.deliveryPhone}
                      </a>
                    </div>
                  )}

                  {/* Note */}
                  {order.deliveryNote && (
                    <p className="text-[10px] text-slate-500 italic bg-white rounded-lg px-2 py-1 border border-slate-200">
                      💬 Izoh: {order.deliveryNote}
                    </p>
                  )}
                </div>

                {/* Items List */}
                {order.items && order.items.length > 0 && (
                  <div className="space-y-1.5 border-t border-slate-100 pt-2">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Buyurtma tarkibi</span>
                    <div className="space-y-1">
                      {order.items.map((item) => (
                        <div key={item.id} className="flex items-center justify-between text-xs py-0.5">
                          <span className="font-medium text-slate-600 truncate max-w-[200px]">
                            {item.productName} × {item.quantity} {item.unit}
                          </span>
                          <span className="font-bold text-slate-800">{formatMoney(item.lineTotal)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Total & Payment */}
                <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs">
                  <span className="text-slate-500 font-medium">
                    To'lov: <strong className="text-slate-800">{order.paymentMethod === 'cash' ? 'Naqd' : 'Onlayn'}</strong> ({order.paymentStatus === 'cash_confirmed' ? <span className="text-emerald-600">Tasdiqlangan</span> : <span className="text-amber-600">Kutilmoqda</span>})
                  </span>
                  <span className="font-black text-sm text-blue-600">{formatMoney(order.total)}</span>
                </div>

                {/* Action Buttons */}
                {order.status === 'pending' && (
                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <button
                      onClick={() => setRejectingOrderId(order.id)}
                      className="py-2.5 rounded-xl bg-red-50 border border-red-200 hover:bg-red-100 text-red-600 text-xs font-black transition-colors"
                    >
                      Rad etish
                    </button>
                    <button
                      onClick={() => handleAdvanceStatus(order)}
                      className="py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-black shadow-lg shadow-emerald-500/25 transition-colors border border-emerald-400/30"
                    >
                      Qabul qilish
                    </button>
                  </div>
                )}
                {order.status !== 'pending' && NEXT_STATUS[order.status] && (
                  <button
                    onClick={() => handleAdvanceStatus(order)}
                    className="w-full py-2.5 rounded-xl bg-blue-500 hover:bg-blue-600 text-white text-xs font-black shadow-lg shadow-blue-500/25 transition-colors border border-blue-400/30"
                  >
                    Keyingi bosqichga o'tkazish → {STATUS_LABEL[NEXT_STATUS[order.status]!]}
                  </button>
                )}
                {order.paymentMethod === 'cash' && order.paymentStatus === 'cash_pending' && (
                  <button
                    onClick={() => void supplierConfirmB2BCashPayment(order.id)}
                    className="w-full py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-black shadow-lg shadow-amber-500/25 transition-colors"
                  >
                    💵 Naqd to'lov qabul qilinganini tasdiqlash
                  </button>
                )}
                {rejectingOrderId === order.id && (
                  <div className="space-y-2 pt-1">
                    <input
                      value={rejectReason}
                      onChange={(e) => setRejectReason(e.target.value)}
                      placeholder="Rad etish sababi *"
                      className={inputCls}
                      autoFocus
                    />
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => { setRejectingOrderId(null); setRejectReason(''); }}
                        className="py-2 rounded-xl bg-slate-100 text-slate-500 text-xs font-black hover:bg-slate-200 transition-colors"
                      >
                        Bekor qilish
                      </button>
                      <button
                        onClick={() => handleReject(order.id)}
                        className="py-2 rounded-xl bg-red-500 hover:bg-red-600 text-white text-xs font-black transition-colors"
                      >
                        Rad etishni tasdiqlash
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )
      ) : (
        <div className="space-y-3">
          <button
            onClick={() => setIsAddOpen(true)}
            className="w-full py-3.5 rounded-2xl bg-blue-500 hover:bg-blue-600 text-white font-black text-sm flex items-center justify-center gap-2 shadow-lg shadow-blue-500/25 transition-all border border-blue-400/30"
          >
            <Plus className="w-4 h-4" /> Mahsulot qo'shish
          </button>
          {ownB2BProducts.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-2xl border border-slate-200 space-y-2">
              <Package className="w-8 h-8 mx-auto text-slate-300" />
              <p className="text-xs font-bold text-slate-500">Hozircha mahsulotlar mavjud emas.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {ownB2BProducts.map((p) => (
                <div key={p.id} className="flex items-center gap-3 bg-white rounded-2xl border border-slate-200 p-3 hover:border-blue-300 transition-all">
                  <img src={p.images[0]} alt={p.name} className="w-12 h-12 rounded-xl object-cover bg-slate-100 shrink-0 border border-slate-200" />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold text-slate-900 truncate">{p.name}</p>
                    <p className="text-[10px] text-slate-500 font-medium mt-0.5">
                      <span className="text-blue-600 font-bold">{formatMoney(p.wholesalePrice)}</span> / {p.unit} · MOQ {p.moq}
                    </p>
                  </div>
                  <span className={`px-2.5 py-1 rounded-full text-[9px] font-black shrink-0 border ${
                    p.status === 'approved' ? 'bg-emerald-50 border-emerald-200 text-emerald-700' :
                    p.status === 'pending' ? 'bg-amber-50 border-amber-200 text-amber-700' :
                    p.status === 'rejected' ? 'bg-red-50 border-red-200 text-red-600' : 'bg-slate-100 border-slate-200 text-slate-500'
                  }`}>
                    {p.status === 'approved' ? 'Faol' : p.status === 'pending' ? 'Kutilmoqda' : p.status === 'rejected' ? 'Rad etildi' : 'Nofaol'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Add Product Modal */}
      {isAddOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-md w-full max-h-[85vh] overflow-y-auto p-5 space-y-3.5 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200">
              <h3 className="font-black text-base text-slate-900">Yangi mahsulot</h3>
              <button onClick={() => setIsAddOpen(false)} className="p-1.5 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleAddSubmit} className="space-y-3">
              <input onChange={(e) => handleFileSelect(e.target.files)} type="file" accept="image/*" multiple className="hidden" id="b2b-product-images" />
              <label htmlFor="b2b-product-images" className="flex items-center justify-center gap-2 bg-slate-50 border-2 border-dashed border-slate-300 rounded-2xl py-4 text-xs font-bold text-slate-500 cursor-pointer hover:border-blue-400 hover:text-blue-600 transition-colors">
                <Upload className="w-4 h-4" /> Rasm yuklash (kamida 1 ta)
              </label>
              {previewUrls.length > 0 && (
                <div className="flex gap-1.5 overflow-x-auto pb-1">
                  {previewUrls.map((u, i) => (
                    <img key={i} src={u} alt="" className="w-14 h-14 rounded-xl object-cover shrink-0 border border-slate-200" />
                  ))}
                </div>
              )}
              <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Mahsulot nomi *" className={inputCls} />
              <div className="grid grid-cols-2 gap-2">
                <input value={form.brand} onChange={(e) => setForm({ ...form, brand: e.target.value })} placeholder="Brend" className={inputCls} />
                <input value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} placeholder="SKU" className={inputCls} />
              </div>
              <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className={inputCls}>
                <option value="">Kategoriya tanlang *</option>
                {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
              <div className="grid grid-cols-3 gap-2">
                <input value={form.wholesalePrice} onChange={(e) => setForm({ ...form, wholesalePrice: e.target.value.replace(/\D/g, '') })} placeholder="Narx *" inputMode="numeric" className={inputCls} />
                <input value={form.moq} onChange={(e) => setForm({ ...form, moq: e.target.value.replace(/\D/g, '') })} placeholder="MOQ" inputMode="numeric" className={inputCls} />
                <input value={form.availableQty} onChange={(e) => setForm({ ...form, availableQty: e.target.value.replace(/\D/g, '') })} placeholder="Mavjud" inputMode="numeric" className={inputCls} />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <input value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} placeholder="Birlik (dona, kg...)" className={inputCls} />
                <input value={form.packaging} onChange={(e) => setForm({ ...form, packaging: e.target.value })} placeholder="Qadoqlash" className={inputCls} />
              </div>
              <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Tavsif" rows={2} className={`${inputCls} resize-none`} />
              <label className="flex items-center gap-2 text-xs font-bold text-slate-700 cursor-pointer">
                <input type="checkbox" checked={form.deliveryAvailable} onChange={(e) => setForm({ ...form, deliveryAvailable: e.target.checked })} className="accent-blue-500 rounded" /> Yetkazib berish mavjud
              </label>
              {form.deliveryAvailable && (
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {REGIONS.filter((r) => r !== 'Barchasi').map((r) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setForm((f) => ({ ...f, deliveryRegions: f.deliveryRegions.includes(r) ? f.deliveryRegions.filter((x) => x !== r) : [...f.deliveryRegions, r] }))}
                      className={`px-2.5 py-1 rounded-xl text-[10px] font-bold transition-all ${
                        form.deliveryRegions.includes(r)
                          ? 'bg-blue-500 text-white shadow-md shadow-blue-500/25'
                          : 'bg-slate-100 text-slate-500 border border-slate-200 hover:text-slate-700'
                      }`}
                    >
                      {r}
                    </button>
                  ))}
                </div>
              )}
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3.5 rounded-2xl bg-blue-500 hover:bg-blue-600 text-white font-black text-sm disabled:opacity-60 flex items-center justify-center gap-2 shadow-lg shadow-blue-500/25 border border-blue-400/30 transition-all mt-2"
              >
                {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Moderatsiyaga yuborish"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
