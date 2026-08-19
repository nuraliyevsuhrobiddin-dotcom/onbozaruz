import React, { useState } from 'react';
import { X, PackagePlus, Upload, Loader2 } from 'lucide-react';
import { useAgroStore } from '../store/useAgroStore';
import { REGIONS } from '../data/mockAgroData';
import { uploadListingMedia } from '../api/authClient';

interface BusinessProductSubmitModalProps {
  onClose: () => void;
}

export const BusinessProductSubmitModal: React.FC<BusinessProductSubmitModalProps> = ({ onClose }) => {
  const { categories, currentUser, addProduct, showToast } = useAgroStore();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const [urlInput, setUrlInput] = useState('');

  const [form, setForm] = useState({
    title: '',
    category: categories.find((c) => c.id !== 'all')?.id || '',
    price: '',
    numericPrice: '',
    minOrder: '1 dona',
    location: currentUser?.location || REGIONS[1] || "Toshkent viloyati",
    description: '',
    phone: currentUser?.phone || '',
    stock: '',
  });

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setSelectedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
  };

  const handleUseUrl = () => {
    if (!urlInput.trim()) return;
    setSelectedFile(null);
    setPreviewUrl(urlInput.trim());
    setUrlInput('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim() || !form.price.trim() || !form.numericPrice.trim()) {
      showToast('Mahsulot nomi va narxini kiriting');
      return;
    }
    if (!previewUrl) {
      showToast('Mahsulot rasmini tanlang');
      return;
    }
    if (!currentUser) return;

    setIsSubmitting(true);
    try {
      let finalImage = previewUrl;
      if (selectedFile) {
        finalImage = await uploadListingMedia(
          selectedFile,
          `${currentUser.id}/business-prod-${Date.now()}-${selectedFile.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`,
          selectedFile.type || 'image/jpeg'
        );
      }

      await addProduct({
        title: form.title.trim(),
        seller: currentUser.businessName?.trim() || currentUser.name || currentUser.handle,
        sellerId: currentUser.id,
        verified: false,
        category: form.category,
        price: form.price.trim(),
        numericPrice: Number(form.numericPrice),
        image: finalImage,
        images: [finalImage],
        minOrder: form.minOrder || '1 dona',
        location: form.location,
        description: form.description?.trim() || '',
        phone: form.phone?.trim() || '',
        stock: form.stock.trim() ? Number(form.stock) : null,
        source: 'user',
        approvalStatus: 'pending',
        submittedBy: currentUser.id,
        submittedAt: new Date().toISOString(),
      });

      showToast("✅ Taklifingiz yuborildi — admin tasdiqlagach Marketda ko'rinadi");
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Xatolik yuz berdi';
      showToast(`❌ ${msg}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-[28px] w-full max-w-lg p-5 space-y-4 shadow-2xl max-h-[92vh] overflow-y-auto">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-[14px] bg-[#5b35f5]/10 text-[#5b35f5] flex items-center justify-center">
              <PackagePlus className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-black text-base text-[#111827]">Market uchun mahsulot taklif qilish</h3>
              <p className="text-[10px] text-slate-400 font-medium">Admin ko'rib chiqib tasdiqlagach e'lon qilinadi</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label className="text-[11px] font-black text-slate-700">Mahsulot rasmi *</label>
            {previewUrl ? (
              <div className="relative aspect-video rounded-[16px] overflow-hidden border-2 border-slate-200 bg-slate-100">
                <img src={previewUrl} alt="" className="w-full h-full object-cover" />
                <button
                  type="button"
                  onClick={() => { setPreviewUrl(''); setSelectedFile(null); }}
                  className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/70 text-white flex items-center justify-center"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <label className="aspect-video rounded-[16px] border-2 border-dashed border-slate-300 hover:border-[#5b35f5] bg-slate-50 flex flex-col items-center justify-center cursor-pointer transition-colors">
                <Upload className="w-6 h-6 text-slate-400" />
                <span className="text-[11px] font-bold text-slate-500 mt-1">Rasm yuklash</span>
                <input type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={handleFileSelect} />
              </label>
            )}
            <div className="flex gap-2">
              <input
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                placeholder="Yoki rasm URL manzili: https://..."
                className="flex-1 bg-slate-100 rounded-[14px] px-3.5 py-2 text-xs font-medium outline-none focus:ring-2 focus:ring-[#5b35f5]/30"
              />
              <button type="button" onClick={handleUseUrl} className="px-3 py-2 rounded-[14px] bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-bold transition-colors shrink-0">
                + Qo'shish
              </button>
            </div>
          </div>

          <div>
            <label className="text-[11px] font-bold text-slate-600">Mahsulot nomi *</label>
            <input
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="Masalan: Yangi hosil olma, 1-nav"
              className="w-full mt-1 bg-slate-100 rounded-[14px] px-3.5 py-2.5 text-xs font-semibold outline-none focus:ring-2 focus:ring-[#5b35f5]/30"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[11px] font-bold text-slate-600">Ko'rinadigan narx *</label>
              <input
                value={form.price}
                onChange={(e) => setForm({ ...form, price: e.target.value })}
                placeholder="12,500 so'm / kg"
                className="w-full mt-1 bg-slate-100 rounded-[14px] px-3.5 py-2.5 text-xs font-semibold outline-none focus:ring-2 focus:ring-[#5b35f5]/30"
                required
              />
            </div>
            <div>
              <label className="text-[11px] font-bold text-slate-600">Saralash narxi (raqam) *</label>
              <input
                value={form.numericPrice}
                onChange={(e) => setForm({ ...form, numericPrice: e.target.value.replace(/[^0-9]/g, '') })}
                placeholder="12500"
                className="w-full mt-1 bg-slate-100 rounded-[14px] px-3.5 py-2.5 text-xs font-semibold outline-none focus:ring-2 focus:ring-[#5b35f5]/30"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[11px] font-bold text-slate-600">Kategoriya</label>
              <select
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
                className="w-full mt-1 bg-slate-100 rounded-[14px] px-3 py-2.5 text-xs font-semibold outline-none"
              >
                {categories.filter((c) => c.id !== 'all').map((c) => (
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

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[11px] font-bold text-slate-600">Minimal buyurtma</label>
              <input
                value={form.minOrder}
                onChange={(e) => setForm({ ...form, minOrder: e.target.value })}
                placeholder="1 dona"
                className="w-full mt-1 bg-slate-100 rounded-[14px] px-3.5 py-2.5 text-xs font-semibold outline-none focus:ring-2 focus:ring-[#5b35f5]/30"
              />
            </div>
            <div>
              <label className="text-[11px] font-bold text-slate-600">
                Zaxira <span className="text-slate-400 font-normal">(ixtiyoriy)</span>
              </label>
              <input
                value={form.stock}
                onChange={(e) => setForm({ ...form, stock: e.target.value.replace(/[^0-9]/g, '') })}
                placeholder="Masalan: 50"
                inputMode="numeric"
                className="w-full mt-1 bg-slate-100 rounded-[14px] px-3.5 py-2.5 text-xs font-semibold outline-none focus:ring-2 focus:ring-[#5b35f5]/30"
              />
            </div>
          </div>

          <div>
            <label className="text-[11px] font-bold text-slate-600">
              Aloqa telefoni <span className="text-slate-400 font-normal">(ixtiyoriy)</span>
            </label>
            <input
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              placeholder="+998 90 123 45 67"
              type="tel"
              className="w-full mt-1 bg-slate-100 rounded-[14px] px-3.5 py-2.5 text-xs font-semibold outline-none focus:ring-2 focus:ring-[#5b35f5]/30"
            />
          </div>

          <div>
            <label className="text-[11px] font-bold text-slate-600">
              Tavsif <span className="text-slate-400 font-normal">(ixtiyoriy)</span>
            </label>
            <textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              rows={3}
              placeholder="Mahsulot haqida to'liq ma'lumot..."
              className="w-full mt-1 bg-slate-100 rounded-[14px] px-3.5 py-2.5 text-xs font-semibold outline-none resize-none focus:ring-2 focus:ring-[#5b35f5]/30"
            />
          </div>

          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 rounded-[16px] bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-colors"
            >
              Bekor
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 py-3 rounded-[16px] bg-[#5b35f5] text-white font-black text-xs hover:brightness-95 transition-colors disabled:opacity-50 flex items-center justify-center gap-2 shadow-md"
            >
              {isSubmitting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <PackagePlus className="w-4 h-4" />
                  <span>Tasdiqlashga yuborish</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
