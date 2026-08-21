import React, { useEffect, useState } from 'react';
import { ArrowLeft, Plus, X, Loader2, Package, ShoppingCart, TrendingUp, Upload } from 'lucide-react';
import { useAgroStore } from '../../store/useAgroStore';
import { categoriesForScope } from '../../utils/categoryScope';
import { REGIONS } from '../../data/mockAgroData';
import { uploadListingMedia } from '../../api/authClient';
import { B2BOrder, B2BOrderStatus } from '../../api/types';

const formatMoney = (value: number) => `${value.toLocaleString('uz-UZ')} so'm`;

const STATUS_LABEL: Record<string, string> = {
  pending: 'Kutilmoqda', supplier_confirmed: 'Tasdiqlandi', preparing: 'Tayyorlanmoqda',
  ready: 'Tayyor', delivering: "Yo'lda", delivered: 'Yetkazildi', cancelled: 'Bekor qilindi', rejected: 'Rad etildi',
};
const NEXT_STATUS: Partial<Record<B2BOrderStatus, B2BOrderStatus>> = {
  pending: 'supplier_confirmed',
  supplier_confirmed: 'preparing',
  preparing: 'ready',
  ready: 'delivering',
  delivering: 'delivered',
};

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
      <div className="w-full max-w-lg mx-auto py-16 px-4 text-center space-y-4">
        <p className="text-sm font-bold text-slate-600">Sizda hali supplier profili yo'q.</p>
        <button onClick={() => setB2BRoute({ view: 'business' })} className="px-6 py-3 rounded-2xl bg-[#DB2777] text-white font-black text-sm">Supplier sifatida qo'shilish</button>
      </div>
    );
  }

  if (supplierProfile.verificationStatus === 'pending') {
    return (
      <div className="w-full max-w-lg mx-auto py-16 px-4 text-center space-y-3">
        <div className="w-14 h-14 mx-auto rounded-full bg-amber-50 flex items-center justify-center text-amber-500 text-2xl">⏳</div>
        <p className="text-sm font-black text-[#111827]">Arizangiz ko'rib chiqilmoqda</p>
        <p className="text-xs text-slate-500">Admin tasdiqlagach mahsulot joylashtirishingiz mumkin bo'ladi.</p>
      </div>
    );
  }
  if (supplierProfile.verificationStatus === 'rejected' || supplierProfile.verificationStatus === 'suspended') {
    return (
      <div className="w-full max-w-lg mx-auto py-16 px-4 text-center space-y-3">
        <p className="text-sm font-black text-rose-600">{supplierProfile.verificationStatus === 'rejected' ? 'Ariza rad etildi' : 'Akkaunt to\'xtatilgan'}</p>
        {supplierProfile.rejectionReason && <p className="text-xs text-slate-500">{supplierProfile.rejectionReason}</p>}
      </div>
    );
  }

  if (!isContractChecked) {
    return (
      <div className="w-full max-w-lg mx-auto py-16 flex justify-center">
        <Loader2 className="w-6 h-6 text-slate-300 animate-spin" />
      </div>
    );
  }

  if (b2bContract?.status !== 'accepted') {
    return (
      <div className="w-full max-w-lg mx-auto py-16 px-4 text-center space-y-4">
        <p className="text-sm font-bold text-slate-600">Mahsulot joylashtirishdan oldin hamkorlik shartnomasini ko'rib chiqing.</p>
        <button onClick={() => setB2BRoute({ view: 'contracts' })} className="px-6 py-3 rounded-2xl bg-[#DB2777] text-white font-black text-sm">Shartnomani ko'rish</button>
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

  return (
    <div className="w-full max-w-170 mx-auto py-3 px-3 space-y-4 select-none pb-20">
      <div className="flex items-center gap-3">
        <button onClick={() => setB2BRoute({ view: 'home' })} className="p-2 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="font-black text-lg text-[#111827]">{supplierProfile.companyName}</h1>
          <p className="text-[11px] text-emerald-600 font-bold">✓ Tasdiqlangan supplier</p>
        </div>
        <button onClick={() => setB2BRoute({ view: 'finance' })} className="ml-auto p-2.5 rounded-full bg-slate-100 text-slate-700">
          <TrendingUp className="w-4 h-4" />
        </button>
      </div>

      <div className="inline-flex p-1 bg-slate-100 rounded-2xl gap-1">
        <button onClick={() => setTab('orders')} className={`px-4 py-2 rounded-xl text-xs font-black transition-colors ${tab === 'orders' ? 'bg-white text-[#111827] shadow-sm' : 'text-slate-500'}`}>
          <ShoppingCart className="w-3.5 h-3.5 inline mr-1" /> Buyurtmalar ({supplierB2BOrders.length})
        </button>
        <button onClick={() => setTab('products')} className={`px-4 py-2 rounded-xl text-xs font-black transition-colors ${tab === 'products' ? 'bg-white text-[#111827] shadow-sm' : 'text-slate-500'}`}>
          <Package className="w-3.5 h-3.5 inline mr-1" /> Mahsulotlar ({ownB2BProducts.length})
        </button>
      </div>

      {tab === 'orders' ? (
        supplierB2BOrders.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-[22px] border border-slate-200/80">
            <p className="text-xs font-bold text-slate-500">Hozircha buyurtmalar mavjud emas.</p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {supplierB2BOrders.map((order) => (
              <div key={order.id} className="bg-white rounded-[20px] border border-slate-200/80 p-3.5 space-y-2.5 shadow-sm">
                <div className="flex items-center justify-between">
                  <span className="font-black text-xs text-[#111827]">{order.orderNumber}</span>
                  <span className="px-2.5 py-1 rounded-full bg-slate-100 text-[10px] font-black text-slate-600">{STATUS_LABEL[order.status]}</span>
                </div>
                <p className="text-[11px] text-slate-500 font-medium">{order.businessName} · {order.deliveryStoreName}</p>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-500 font-semibold">{(order.items || []).length} ta mahsulot</span>
                  <span className="font-black text-[#DB2777]">{formatMoney(order.total)}</span>
                </div>
                {order.status === 'pending' && (
                  <div className="grid grid-cols-2 gap-2">
                    <button onClick={() => setRejectingOrderId(order.id)} className="py-2 rounded-xl bg-rose-50 text-rose-700 text-xs font-black">Rad etish</button>
                    <button onClick={() => handleAdvanceStatus(order)} className="py-2 rounded-xl bg-emerald-50 text-emerald-700 text-xs font-black">Qabul qilish</button>
                  </div>
                )}
                {order.status !== 'pending' && NEXT_STATUS[order.status] && (
                  <button onClick={() => handleAdvanceStatus(order)} className="w-full py-2 rounded-xl bg-[#111827] text-white text-xs font-black">
                    → {STATUS_LABEL[NEXT_STATUS[order.status]!]}
                  </button>
                )}
                {order.paymentMethod === 'cash' && order.paymentStatus === 'cash_pending' && (
                  <button onClick={() => void supplierConfirmB2BCashPayment(order.id)} className="w-full py-2 rounded-xl bg-amber-50 text-amber-700 text-xs font-black">
                    Naqd to'lovni tasdiqlash
                  </button>
                )}
                {rejectingOrderId === order.id && (
                  <div className="space-y-2 pt-1">
                    <input value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} placeholder="Rad etish sababi *" className="w-full bg-slate-100 rounded-xl px-3 py-2 text-xs font-medium outline-none" />
                    <div className="grid grid-cols-2 gap-2">
                      <button onClick={() => { setRejectingOrderId(null); setRejectReason(''); }} className="py-2 rounded-xl bg-slate-100 text-slate-600 text-xs font-black">Bekor</button>
                      <button onClick={() => handleReject(order.id)} className="py-2 rounded-xl bg-rose-600 text-white text-xs font-black">Tasdiqlash</button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )
      ) : (
        <div className="space-y-3">
          <button onClick={() => setIsAddOpen(true)} className="w-full py-3 rounded-2xl bg-[#DB2777] text-white font-black text-sm flex items-center justify-center gap-2">
            <Plus className="w-4 h-4" /> Mahsulot qo'shish
          </button>
          {ownB2BProducts.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-[22px] border border-slate-200/80">
              <p className="text-xs font-bold text-slate-500">Hozircha mahsulotlar mavjud emas.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {ownB2BProducts.map((p) => (
                <div key={p.id} className="flex items-center gap-3 bg-white rounded-[16px] border border-slate-200/80 p-3">
                  <img src={p.images[0]} alt={p.name} className="w-12 h-12 rounded-[10px] object-cover bg-slate-100 shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold text-[#111827] truncate">{p.name}</p>
                    <p className="text-[10px] text-slate-400 font-medium">{formatMoney(p.wholesalePrice)} / {p.unit} · MOQ {p.moq}</p>
                  </div>
                  <span className={`px-2 py-1 rounded-full text-[9px] font-black shrink-0 ${
                    p.status === 'approved' ? 'bg-emerald-50 text-emerald-700' :
                    p.status === 'pending' ? 'bg-amber-50 text-amber-700' :
                    p.status === 'rejected' ? 'bg-rose-50 text-rose-700' : 'bg-slate-100 text-slate-500'
                  }`}>{p.status === 'approved' ? 'Faol' : p.status === 'pending' ? 'Kutilmoqda' : p.status === 'rejected' ? 'Rad etildi' : 'Nofaol'}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {isAddOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-[26px] max-w-md w-full max-h-[85vh] overflow-y-auto p-5 space-y-3 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="font-black text-base text-[#111827]">Yangi mahsulot</h3>
              <button onClick={() => setIsAddOpen(false)} className="p-1.5 rounded-full hover:bg-slate-100 text-slate-500"><X className="w-4 h-4" /></button>
            </div>
            <form onSubmit={handleAddSubmit} className="space-y-2.5">
              <input onChange={(e) => handleFileSelect(e.target.files)} type="file" accept="image/*" multiple className="hidden" id="b2b-product-images" />
              <label htmlFor="b2b-product-images" className="flex items-center justify-center gap-2 border-2 border-dashed border-slate-200 rounded-xl py-4 text-xs font-bold text-slate-500 cursor-pointer">
                <Upload className="w-4 h-4" /> Rasm yuklash (kamida 1 ta)
              </label>
              {previewUrls.length > 0 && (
                <div className="flex gap-1.5 overflow-x-auto">
                  {previewUrls.map((u, i) => <img key={i} src={u} alt="" className="w-14 h-14 rounded-lg object-cover shrink-0" />)}
                </div>
              )}
              <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Mahsulot nomi *" className="w-full bg-slate-100 rounded-xl px-3 py-2.5 text-xs font-bold outline-none" />
              <div className="grid grid-cols-2 gap-2">
                <input value={form.brand} onChange={(e) => setForm({ ...form, brand: e.target.value })} placeholder="Brend" className="bg-slate-100 rounded-xl px-3 py-2.5 text-xs font-bold outline-none" />
                <input value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} placeholder="SKU" className="bg-slate-100 rounded-xl px-3 py-2.5 text-xs font-bold outline-none" />
              </div>
              <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className="w-full bg-slate-100 rounded-xl px-3 py-2.5 text-xs font-bold">
                <option value="">Kategoriya tanlang *</option>
                {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
              <div className="grid grid-cols-3 gap-2">
                <input value={form.wholesalePrice} onChange={(e) => setForm({ ...form, wholesalePrice: e.target.value.replace(/\D/g, '') })} placeholder="Narx *" inputMode="numeric" className="bg-slate-100 rounded-xl px-3 py-2.5 text-xs font-bold outline-none" />
                <input value={form.moq} onChange={(e) => setForm({ ...form, moq: e.target.value.replace(/\D/g, '') })} placeholder="MOQ" inputMode="numeric" className="bg-slate-100 rounded-xl px-3 py-2.5 text-xs font-bold outline-none" />
                <input value={form.availableQty} onChange={(e) => setForm({ ...form, availableQty: e.target.value.replace(/\D/g, '') })} placeholder="Mavjud" inputMode="numeric" className="bg-slate-100 rounded-xl px-3 py-2.5 text-xs font-bold outline-none" />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <input value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} placeholder="Birlik (dona, kg...)" className="bg-slate-100 rounded-xl px-3 py-2.5 text-xs font-bold outline-none" />
                <input value={form.packaging} onChange={(e) => setForm({ ...form, packaging: e.target.value })} placeholder="Qadoqlash" className="bg-slate-100 rounded-xl px-3 py-2.5 text-xs font-bold outline-none" />
              </div>
              <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Tavsif" rows={2} className="w-full bg-slate-100 rounded-xl px-3 py-2.5 text-xs font-bold outline-none resize-none" />
              <label className="flex items-center gap-2 text-xs font-bold text-slate-700">
                <input type="checkbox" checked={form.deliveryAvailable} onChange={(e) => setForm({ ...form, deliveryAvailable: e.target.checked })} /> Yetkazib berish mavjud
              </label>
              {form.deliveryAvailable && (
                <div className="flex flex-wrap gap-1.5">
                  {REGIONS.filter((r) => r !== 'Barchasi').map((r) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setForm((f) => ({ ...f, deliveryRegions: f.deliveryRegions.includes(r) ? f.deliveryRegions.filter((x) => x !== r) : [...f.deliveryRegions, r] }))}
                      className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${form.deliveryRegions.includes(r) ? 'bg-[#111827] text-white' : 'bg-slate-100 text-slate-600'}`}
                    >{r}</button>
                  ))}
                </div>
              )}
              <button type="submit" disabled={isSubmitting} className="w-full py-3 rounded-2xl bg-[#DB2777] text-white font-black text-sm disabled:opacity-60 flex items-center justify-center gap-2">
                {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Moderatsiyaga yuborish"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
