import React, { useState } from 'react';
import { Search, Edit3, Trash2, CheckCircle, XCircle, Plus, X, PackagePlus, Upload, Image as ImageIcon, Send, Sparkles } from 'lucide-react';
import { Product } from '../../data/mockAgroData';
import { CATEGORIES, REGIONS } from '../../data/mockAgroData';
import { useAgroStore } from '../../store/useAgroStore';
import { adminRepository } from '../../api/adminRepository';
import { uploadListingMedia } from '../../api/authClient';

interface AdminProductsTabProps {
  products: Product[];
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
  onDelete: (id: string) => void;
  onEdit: (item: Product) => void;
  onAdd: () => void;
  onLogAction: (action: string, targetId: string, oldVal: any, newVal: any) => void;
  showToast: (msg: string) => void;
}

export const AdminProductsTab: React.FC<AdminProductsTabProps> = ({
  products, onApprove, onReject, onDelete, onEdit, onLogAction, showToast,
}) => {
  const { addProduct, currentUser } = useAgroStore();
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');
  const [actingId, setActingId] = useState<string | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // File Upload State (Ozon / Uzum style multi-image picker)
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const [urlInput, setUrlInput] = useState('');

  const [form, setForm] = useState({
    title: '',
    seller: 'Shartnomali hamkor',
    category: CATEGORIES[1]?.id || 'fruits',
    price: '',
    numericPrice: '',
    minOrder: '1 dona',
    location: REGIONS[1] || "Toshkent viloyati",
    description: '',
    features: '',
    discount: '',
  });

  const filtered = products.filter((p) => {
    const matchSearch = !search || p.title.toLowerCase().includes(search.toLowerCase()) || p.seller.toLowerCase().includes(search.toLowerCase());
    const matchStatus = filterStatus === 'all' || p.approvalStatus === filterStatus;
    return matchSearch && matchStatus;
  });

  const pendingProducts = products.filter((p) => p.approvalStatus === 'pending');

  const handleApprove = async (p: Product) => {
    if (!window.confirm(`"${p.title}" — tasdiqlashni tasdiqlaysizmi?`)) return;
    setActingId(p.id);
    try {
      await adminRepository.updateProductModeration(p.id, 'approved');
      await onLogAction('approve_product', p.id, { status: p.approvalStatus }, { status: 'approved' });
      onApprove(p.id);
      showToast('Mahsulot tasdiqlandi!');
    } catch (e: any) {
      showToast(e.message || 'Xatolik');
    } finally {
      setActingId(null);
    }
  };

  const handleReject = async (p: Product) => {
    if (!window.confirm(`"${p.title}" — rad etishni tasdiqlaysizmi?`)) return;
    setActingId(p.id);
    try {
      await adminRepository.updateProductModeration(p.id, 'rejected');
      await onLogAction('reject_product', p.id, { status: p.approvalStatus }, { status: 'rejected' });
      onReject(p.id);
      showToast('Mahsulot rad etildi');
    } catch (e: any) {
      showToast(e.message || 'Xatolik');
    } finally {
      setActingId(null);
    }
  };

  const handleDelete = async (p: Product) => {
    if (!window.confirm(`"${p.title}" mahsulotini o'chirishni tasdiqlaysizmi?`)) return;
    setActingId(p.id);
    try {
      await adminRepository.deleteProductByAdmin(p.id);
      await onLogAction('delete_product', p.id, { title: p.title }, null);
      onDelete(p.id);
      showToast("Mahsulot o'chirildi");
    } catch (e: any) {
      showToast(e.message || 'Xatolik');
    } finally {
      setActingId(null);
    }
  };

  // Image Selection Handler (File Upload)
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.length) return;
    const newFiles = Array.from(e.target.files);
    setSelectedFiles((prev) => [...prev, ...newFiles]);

    const newPreviews = newFiles.map((file) => URL.createObjectURL(file));
    setPreviewUrls((prev) => [...prev, ...newPreviews]);
  };

  const handleRemoveImage = (index: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
    setPreviewUrls((prev) => prev.filter((_, i) => i !== index));
  };

  const handleAddUrlImage = () => {
    if (!urlInput.trim()) return;
    setPreviewUrls((prev) => [...prev, urlInput.trim()]);
    setUrlInput('');
  };

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title || !form.price || !form.numericPrice) {
      showToast("Mahsulot nomi va narxini kiriting");
      return;
    }
    if (!currentUser) {
      showToast("⛔ Mahsulot qo'shish uchun tizimga kiring");
      return;
    }

    setIsSubmitting(true);
    try {
      // 1. Upload local selected files directly (File objects → Supabase Storage)
      let uploadedUrls: string[] = [];
      if (selectedFiles.length > 0) {
        uploadedUrls = await Promise.all(
          selectedFiles.map((file, idx) =>
            uploadListingMedia(
              file,
              `${currentUser.id}/market-prod-${Date.now()}-${idx}-${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`,
              file.type || 'image/jpeg'
            )
          )
        );
      }

      // 2. URL maydoniga yozilgan rasmlarni qo'shish
      const urlPreviews = previewUrls.filter((u) => u.startsWith('http://') || u.startsWith('https://'));
      const finalImages = [...uploadedUrls, ...urlPreviews];
      const mainImage = finalImages[0] || 'https://images.unsplash.com/photo-1560493676-04071c5f467b?w=600&auto=format&fit=crop&q=80';

      // 3. Mahsulot ob'ekti — id berilmaydi (Supabase UUID qaytaradi)
      const newProd: Omit<Product, 'id' | 'rating' | 'reviewsCount'> & { id?: string; rating?: number; reviewsCount?: number } = {
        sellerId: currentUser.id,
        title: form.title.trim(),
        seller: (form.seller || currentUser.name || 'Shartnomali hamkor').trim(),
        verified: true,
        approvalStatus: 'approved',
        source: 'admin',
        approvedAt: new Date().toISOString(),
        submittedAt: new Date().toISOString(),
        submittedBy: currentUser.id,
        category: form.category,
        price: form.price.trim(),
        numericPrice: Number(form.numericPrice),
        image: mainImage,
        images: finalImages.length > 0 ? finalImages : [mainImage],
        description: form.description?.trim() || '',
        features: form.features?.trim() || '',
        minOrder: form.minOrder || '1 dona',
        discount: form.discount?.trim() || '',
        location: form.location,
      };

      await addProduct(newProd as Product);
      await onLogAction('create_product', newProd.title, null, newProd);
      showToast("✅ Marketga yangi mahsulot muvaffaqiyatli joylandi!");
      setIsAddModalOpen(false);

      // Formni tozalash
      setSelectedFiles([]);
      setPreviewUrls([]);
      setForm({
        title: '',
        seller: 'Shartnomali hamkor',
        category: CATEGORIES[1]?.id || 'fruits',
        price: '',
        numericPrice: '',
        minOrder: '1 dona',
        location: REGIONS[1] || "Toshkent viloyati",
        description: '',
        features: '',
        discount: '',
      });
    } catch (err: any) {
      console.error('[AdminProductsTab] handleAddSubmit error:', err);
      const msg = err?.message || String(err) || 'Noma\'lum xatolik yuz berdi';
      showToast(`❌ Xatolik: ${msg}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const statusColor: Record<string, string> = {
    pending: 'bg-amber-50 text-amber-700 border-amber-200',
    approved: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    rejected: 'bg-red-50 text-red-700 border-red-200',
  };

  return (
    <div className="space-y-4 select-none">
      {/* ─── Header & Add Button ─── */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h2 className="font-black text-xl text-[#111827]">Market mahsulotlari</h2>
          <p className="text-xs text-slate-400 font-medium">
            {products.length} ta mahsulot · Uzum/Ozon rasmiy do'koni
          </p>
        </div>
        <button
          onClick={() => setIsAddModalOpen(true)}
          className="px-4 py-2.5 rounded-[18px] bg-[#E53935] text-white font-black text-xs hover:bg-[#C62828] transition-all flex items-center gap-2 shadow-md active:scale-95"
        >
          <Plus className="w-4 h-4" /> Mahsulot joylash
        </button>
      </div>

      {/* ─── Telegram Bot Submissions Notification Banner ─── */}
      {pendingProducts.length > 0 && (
        <div className="bg-amber-50 rounded-[22px] border border-amber-200/80 p-4 shadow-sm space-y-3">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-amber-500/20 flex items-center justify-center text-amber-700">
                <Send className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-black text-xs text-amber-900">Telegram Bot kelib tushgan e'lonlar</h3>
                <p className="text-[10px] text-amber-700 font-medium">Foydalanuvchilar yuborgan {pendingProducts.length} ta e'lon moderatsiyada</p>
              </div>
            </div>
            <span className="px-2.5 py-1 rounded-full bg-amber-500 text-white text-[10px] font-black">
              {pendingProducts.length} ta kutmoqda
            </span>
          </div>

          <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
            {pendingProducts.map((p) => (
              <div key={p.id} className="bg-white rounded-[16px] border border-amber-200 p-2.5 flex items-center gap-3 shadow-xs">
                <img
                  src={p.images?.[0] || p.image}
                  alt=""
                  className="w-12 h-12 rounded-[12px] object-cover bg-slate-100 shrink-0"
                  onError={(e) => { (e.target as HTMLImageElement).src = 'https://placehold.co/48x48?text=IMG'; }}
                />
                <div className="flex-1 min-w-0">
                  <h4 className="font-black text-xs text-[#111827] truncate">{p.title}</h4>
                  <p className="text-[10px] text-slate-500 truncate">{p.seller} · {p.location}</p>
                  <p className="text-[10px] font-black text-[#E53935]">{p.price}</p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    disabled={actingId === p.id}
                    onClick={() => handleApprove(p)}
                    className="px-2.5 py-1.5 rounded-[10px] bg-emerald-500 text-white font-black text-[10px] hover:bg-emerald-600 transition-colors disabled:opacity-50 flex items-center gap-1"
                  >
                    <CheckCircle className="w-3 h-3" /> Tasdiqlash
                  </button>
                  <button
                    disabled={actingId === p.id}
                    onClick={() => handleReject(p)}
                    className="p-1.5 rounded-[10px] bg-red-50 text-red-600 hover:bg-red-100 transition-colors disabled:opacity-50"
                  >
                    <XCircle className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ─── Search & Filters ─── */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="relative flex-1 min-w-[160px]">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Mahsulot nomi, sotuvchi..."
            className="w-full pl-10 pr-3 py-2 rounded-[14px] border border-slate-200 bg-slate-50 text-xs font-semibold outline-none focus:border-[#E53935] transition-colors"
          />
        </div>
        <div className="flex items-center gap-1.5">
          {(['all', 'pending', 'approved', 'rejected'] as const).map((s) => (
            <button
              key={s}
              onClick={() => setFilterStatus(s)}
              className={`px-2.5 py-1.5 rounded-[12px] text-[10px] font-black transition-colors ${
                filterStatus === s ? 'bg-[#111827] text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {s === 'all' ? 'Barchasi' : s === 'pending' ? 'Kutmoqda' : s === 'approved' ? 'Faol' : 'Rad etilgan'}
            </button>
          ))}
        </div>
      </div>

      {/* ─── Product List ─── */}
      <div className="space-y-2">
        {filtered.length === 0 ? (
          <div className="py-10 text-center bg-white rounded-[22px] border border-slate-200/80">
            <p className="text-xs font-bold text-slate-400">Mahsulotlar topilmadi</p>
          </div>
        ) : (
          filtered.map((p) => (
            <div key={p.id} className="bg-white rounded-[20px] border border-slate-200/80 p-3 shadow-sm flex items-center gap-3">
              <img
                src={p.image}
                alt={p.title}
                className="w-14 h-14 rounded-[14px] object-cover shrink-0 bg-slate-100"
                onError={(e) => { (e.target as HTMLImageElement).src = 'https://placehold.co/56x56?text=IMG'; }}
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="font-bold text-xs text-[#111827] truncate max-w-[140px]">{p.title}</span>
                  <span className={`px-1.5 py-0.5 rounded-full text-[9px] font-black border ${statusColor[p.approvalStatus || 'pending']}`}>
                    {p.approvalStatus || 'pending'}
                  </span>
                  {p.source === 'telegram_bot' && (
                    <span className="px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-blue-50 text-blue-600 border border-blue-200">
                      Telegram Bot
                    </span>
                  )}
                </div>
                <p className="text-[10px] text-slate-400 font-medium">{p.seller} · {p.location}</p>
                <p className="text-[10px] font-bold text-[#E53935]">{p.price}</p>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                {p.approvalStatus === 'pending' && (
                  <>
                    <button
                      disabled={actingId === p.id}
                      onClick={() => handleApprove(p)}
                      className="p-1.5 rounded-[10px] bg-emerald-50 hover:bg-emerald-100 text-emerald-600 disabled:opacity-50 transition-colors"
                      title="Tasdiqlash"
                    >
                      <CheckCircle className="w-4 h-4" />
                    </button>
                    <button
                      disabled={actingId === p.id}
                      onClick={() => handleReject(p)}
                      className="p-1.5 rounded-[10px] bg-amber-50 hover:bg-amber-100 text-amber-600 disabled:opacity-50 transition-colors"
                      title="Rad etish"
                    >
                      <XCircle className="w-4 h-4" />
                    </button>
                  </>
                )}
                <button
                  onClick={() => onEdit(p)}
                  className="p-1.5 rounded-[10px] bg-blue-50 hover:bg-blue-100 text-blue-600 transition-colors"
                  title="Tahrirlash"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                </button>
                <button
                  disabled={actingId === p.id}
                  onClick={() => handleDelete(p)}
                  className="p-1.5 rounded-[10px] bg-red-50 hover:bg-red-100 text-red-600 disabled:opacity-50 transition-colors"
                  title="O'chirish"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* ─── Admin Uzum/Ozon Inspired Product Creation Modal ─── */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-[28px] w-full max-w-lg p-5 space-y-4 shadow-2xl max-h-[92vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-[14px] bg-[#E53935]/10 text-[#E53935] flex items-center justify-center">
                  <PackagePlus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-base text-[#111827]">Uzum/Ozon Market Mahsuloti</h3>
                  <p className="text-[10px] text-slate-400 font-medium">Rasmiy do'konga yangi mahsulot yuklash</p>
                </div>
              </div>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="p-1.5 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddSubmit} className="space-y-4">
              {/* 📸 Uzum/Ozon Multi-Image Uploader */}
              <div className="space-y-2">
                <label className="text-[11px] font-black text-slate-700 flex items-center justify-between">
                  <span>Mahsulot rasmlari *</span>
                  <span className="text-[10px] text-slate-400 font-normal">Kamida 1 ta rasm yuklang</span>
                </label>

                {/* Previews Grid */}
                <div className="grid grid-cols-4 gap-2">
                  {previewUrls.map((url, idx) => (
                    <div key={idx} className="relative aspect-square rounded-[16px] overflow-hidden border-2 border-slate-200 group bg-slate-100">
                      <img src={url} alt="" className="w-full h-full object-cover" />
                      {idx === 0 && (
                        <span className="absolute bottom-1 left-1 bg-[#E53935] text-white text-[8px] font-black px-1.5 py-0.5 rounded-md">
                          Asosiy
                        </span>
                      )}
                      <button
                        type="button"
                        onClick={() => handleRemoveImage(idx)}
                        className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/70 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}

                  {/* Dropzone File Input */}
                  <label className="aspect-square rounded-[16px] border-2 border-dashed border-slate-300 hover:border-[#E53935] bg-slate-50 flex flex-col items-center justify-center cursor-pointer transition-colors p-2 text-center group">
                    <Upload className="w-5 h-5 text-slate-400 group-hover:text-[#E53935] transition-colors" />
                    <span className="text-[9px] font-black text-slate-500 group-hover:text-[#E53935] mt-1">Rasm yuklash</span>
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      multiple
                      className="sr-only"
                      onChange={handleFileSelect}
                    />
                  </label>
                </div>

                {/* URL Paste Fallback */}
                <div className="flex gap-2 pt-1">
                  <input
                    value={urlInput}
                    onChange={(e) => setUrlInput(e.target.value)}
                    placeholder="Yoki rasm URL manzili: https://..."
                    className="flex-1 bg-slate-100 rounded-[14px] px-3.5 py-2 text-xs font-medium outline-none focus:ring-2 focus:ring-[#E53935]/30"
                  />
                  <button
                    type="button"
                    onClick={handleAddUrlImage}
                    className="px-3 py-2 rounded-[14px] bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-bold transition-colors shrink-0"
                  >
                    + Qo'shish
                  </button>
                </div>
              </div>

              {/* Title & Seller */}
              <div className="space-y-3">
                <div>
                  <label className="text-[11px] font-bold text-slate-600">Mahsulot nomi *</label>
                  <input
                    value={form.title}
                    onChange={(e) => setForm({ ...form, title: e.target.value })}
                    placeholder="Masalan: Oziq-ovqat va sarxil olma (Gala)"
                    className="w-full mt-1 bg-slate-100 rounded-[14px] px-3.5 py-2.5 text-xs font-semibold outline-none focus:ring-2 focus:ring-[#E53935]/30"
                    required
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-600">Sotuvchi / Hamkor brend *</label>
                  <input
                    value={form.seller}
                    onChange={(e) => setForm({ ...form, seller: e.target.value })}
                    placeholder="Shartnomali hamkor"
                    className="w-full mt-1 bg-slate-100 rounded-[14px] px-3.5 py-2.5 text-xs font-semibold outline-none focus:ring-2 focus:ring-[#E53935]/30"
                  />
                </div>
              </div>

              {/* Price & Numeric Price */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[11px] font-bold text-slate-600">Ko'rinadigan narx *</label>
                  <input
                    value={form.price}
                    onChange={(e) => setForm({ ...form, price: e.target.value })}
                    placeholder="12,500 so'm / kg"
                    className="w-full mt-1 bg-slate-100 rounded-[14px] px-3.5 py-2.5 text-xs font-semibold outline-none focus:ring-2 focus:ring-[#E53935]/30"
                    required
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-slate-600">Saralash narxi (raqam) *</label>
                  <input
                    value={form.numericPrice}
                    onChange={(e) => setForm({ ...form, numericPrice: e.target.value.replace(/[^0-9]/g, '') })}
                    placeholder="12500"
                    className="w-full mt-1 bg-slate-100 rounded-[14px] px-3.5 py-2.5 text-xs font-semibold outline-none focus:ring-2 focus:ring-[#E53935]/30"
                    required
                  />
                </div>
              </div>

              {/* Category & Region */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[11px] font-bold text-slate-600">Kategoriya</label>
                  <select
                    value={form.category}
                    onChange={(e) => setForm({ ...form, category: e.target.value })}
                    className="w-full mt-1 bg-slate-100 rounded-[14px] px-3 py-2.5 text-xs font-semibold outline-none"
                  >
                    {CATEGORIES.filter((c) => c.id !== 'all').map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-[11px] font-bold text-slate-600">Hudud</label>
                  <select
                    value={form.location}
                    onChange={(e) => setForm({ ...form, location: e.target.value })}
                    className="w-full mt-1 bg-slate-100 rounded-[14px] px-3 py-2.5 text-xs font-semibold outline-none"
                  >
                    {REGIONS.filter((r) => r !== 'Barchasi').map((r) => (
                      <option key={r} value={r}>{r}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Min Order & Discount Badge */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[11px] font-bold text-slate-600">Minimal buyurtma</label>
                  <input
                    value={form.minOrder}
                    onChange={(e) => setForm({ ...form, minOrder: e.target.value })}
                    placeholder="1 dona"
                    className="w-full mt-1 bg-slate-100 rounded-[14px] px-3.5 py-2.5 text-xs font-semibold outline-none focus:ring-2 focus:ring-[#E53935]/30"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-slate-600">Chegirma / Aksiya yorlig'i</label>
                  <input
                    value={form.discount}
                    onChange={(e) => setForm({ ...form, discount: e.target.value })}
                    placeholder="Masalan: -20% yoki Aksiya"
                    className="w-full mt-1 bg-slate-100 rounded-[14px] px-3.5 py-2.5 text-xs font-semibold outline-none focus:ring-2 focus:ring-[#E53935]/30"
                  />
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="text-[11px] font-bold text-slate-600">Batafsil tavsif</label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  rows={3}
                  placeholder="Mahsulot haqida to'liq ma'lumot va xususiyatlar..."
                  className="w-full mt-1 bg-slate-100 rounded-[14px] px-3.5 py-2.5 text-xs font-semibold outline-none resize-none focus:ring-2 focus:ring-[#E53935]/30"
                />
              </div>

              {/* Actions */}
              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="flex-1 py-3 rounded-[16px] bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-colors"
                >
                  Bekor
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 py-3 rounded-[16px] bg-[#E53935] text-white font-black text-xs hover:bg-[#C62828] transition-colors disabled:opacity-50 flex items-center justify-center gap-2 shadow-md"
                >
                  {isSubmitting ? (
                    <span>Yuklanmoqda...</span>
                  ) : (
                    <>
                      <PackagePlus className="w-4 h-4" />
                      <span>Marketga joylash</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
