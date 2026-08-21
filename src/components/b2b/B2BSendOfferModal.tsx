import React, { useEffect, useState } from 'react';
import { X, Send, ShieldCheck, Tag, Loader2, Sparkles } from 'lucide-react';
import { useAgroStore } from '../../store/useAgroStore';
import { b2bRepository } from '../../api/b2bRepository';
import { B2BStorePublicMarker } from '../../api/types';

const formatMoney = (value: number) => `${value.toLocaleString('uz-UZ')} so'm`;

interface Props {
  store: B2BStorePublicMarker;
  onClose: () => void;
}

export const B2BSendOfferModal: React.FC<Props> = ({ store, onClose }) => {
  const { supplierProfile, ownB2BProducts, fetchOwnB2BProducts, showToast, isAuthenticated, setAuthPromptOpen } = useAgroStore();
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([]);
  const [discountPercent, setDiscountPercent] = useState<number>(10);
  const [message, setMessage] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (supplierProfile) {
      void fetchOwnB2BProducts();
    }
  }, [supplierProfile, fetchOwnB2BProducts]);

  if (!isAuthenticated) {
    return (
      <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl p-6 max-w-sm w-full text-center space-y-4 shadow-2xl">
          <div className="w-12 h-12 rounded-2xl bg-pink-50 text-[#DB2777] flex items-center justify-center mx-auto">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <h3 className="font-black text-base text-[#111827]">Tizimga kiring</h3>
          <p className="text-xs text-slate-500 font-medium">Do'konlarga tijoriy taklif yuborish uchun profilingizga kiring.</p>
          <div className="flex gap-2">
            <button onClick={onClose} className="flex-1 py-3 rounded-xl bg-slate-100 font-bold text-xs text-slate-700">Yopish</button>
            <button onClick={() => { onClose(); setAuthPromptOpen(true); }} className="flex-1 py-3 rounded-xl bg-[#DB2777] text-white font-bold text-xs">Kirish</button>
          </div>
        </div>
      </div>
    );
  }

  if (!supplierProfile) {
    return (
      <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl p-6 max-w-sm w-full text-center space-y-4 shadow-2xl">
          <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto">
            <Tag className="w-6 h-6" />
          </div>
          <h3 className="font-black text-base text-[#111827]">Supplier profili kerak</h3>
          <p className="text-xs text-slate-500 font-medium">Do'konlarga to'g'ridan-to'g'ri maxsus taklif yuborish uchun ishlab chiqaruvchi yoki distribyutor sifatida ro'yxatdan o'tgan bo'lishingiz kerak.</p>
          <button onClick={onClose} className="w-full py-3 rounded-xl bg-[#111827] text-white font-bold text-xs">Tushunarli</button>
        </div>
      </div>
    );
  }

  const toggleProduct = (id: string) => {
    setSelectedProductIds((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedProductIds.length === 0) {
      showToast("Iltimos, kamida bitta mahsulot tanlang");
      return;
    }

    setIsSubmitting(true);
    try {
      const offerProducts = ownB2BProducts
        .filter((p) => selectedProductIds.includes(p.id))
        .map((p) => {
          const discountMultiplier = (100 - discountPercent) / 100;
          return {
            productId: p.id,
            productName: p.name,
            wholesalePrice: p.wholesalePrice,
            offerPrice: Math.round(p.wholesalePrice * discountMultiplier),
            unit: p.unit,
          };
        });

      await b2bRepository.sendDirectOffer({
        supplierId: supplierProfile.id,
        supplierName: supplierProfile.companyName,
        businessId: store.id,
        storeName: store.storeName,
        message: message.trim() || `${supplierProfile.companyName} dan ${store.storeName} uchun maxsus ${discountPercent}% chegirmali taklif!`,
        discountPercent,
        products: offerProducts,
      });

      showToast(`✅ "${store.storeName}" do'koniga maxsus taklif yuborildi!`);
      onClose();
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Taklif yuborishda xatolik");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white rounded-3xl max-w-lg w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-1.5 text-[11px] font-black uppercase tracking-wide text-[#DB2777]">
              <Sparkles className="w-3.5 h-3.5" /> B2B Maxsus Taklif
            </div>
            <h2 className="font-black text-base text-[#111827]">{store.storeName}</h2>
          </div>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-4 space-y-4 overflow-y-auto flex-1">
          <div className="bg-pink-50/70 border border-pink-200/60 rounded-2xl p-3 text-xs text-pink-900 space-y-1">
            <p className="font-extrabold flex items-center gap-1">
              <ShieldCheck className="w-4 h-4 text-[#DB2777]" /> Xavfsiz va to'g'ridan-to'g'ri taklif
            </p>
            <p className="text-[11px] text-pink-800/80 leading-relaxed">
              Do'konga taklif yuborilganda, do'kon egasi ilova ichida bildirishnoma oladi va taklif etilgan maxsus narxlarda to'g'ridan-to'g'ri buyurtma bera oladi.
            </p>
          </div>

          {/* Discount Slider */}
          <div className="bg-slate-50 rounded-2xl p-3.5 space-y-2 border border-slate-200/70">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-slate-700">Maxsus chegirma foizi</span>
              <span className="px-2.5 py-1 rounded-xl bg-[#DB2777] text-white font-black text-xs">{discountPercent}% chegirma</span>
            </div>
            <input
              type="range"
              min={3}
              max={30}
              step={1}
              value={discountPercent}
              onChange={(e) => setDiscountPercent(Number(e.target.value))}
              className="w-full accent-[#DB2777] cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-slate-400 font-bold">
              <span>3%</span>
              <span>10%</span>
              <span>20%</span>
              <span>30%</span>
            </div>
          </div>

          {/* Select Products */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-black text-[#111827]">Taklif qilinadigan mahsulotlar ({selectedProductIds.length} ta)</label>
              {ownB2BProducts.length > 0 && (
                <button
                  type="button"
                  onClick={() => setSelectedProductIds(selectedProductIds.length === ownB2BProducts.length ? [] : ownB2BProducts.map((p) => p.id))}
                  className="text-[11px] font-bold text-[#DB2777]"
                >
                  {selectedProductIds.length === ownB2BProducts.length ? "Bekor qilish" : "Barchasini tanlash"}
                </button>
              )}
            </div>

            {ownB2BProducts.length === 0 ? (
              <p className="text-xs text-slate-400 font-medium py-4 text-center bg-slate-50 rounded-2xl">
                Sizda hali tasdiqlangan mahsulotlar yo'q. Avval supplier panelidan mahsulot qo'shing.
              </p>
            ) : (
              <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1">
                {ownB2BProducts.map((prod) => {
                  const isSelected = selectedProductIds.includes(prod.id);
                  const discountedPrice = Math.round(prod.wholesalePrice * ((100 - discountPercent) / 100));
                  return (
                    <div
                      key={prod.id}
                      onClick={() => toggleProduct(prod.id)}
                      className={`p-2.5 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-2.5 ${
                        isSelected ? 'border-[#DB2777] bg-pink-50/40' : 'border-slate-200 bg-white hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        {prod.images[0] ? (
                          <img src={prod.images[0]} alt={prod.name} className="w-10 h-10 rounded-xl object-cover bg-slate-100 shrink-0" />
                        ) : (
                          <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-[10px] text-slate-400 font-bold shrink-0">Rasm yo'q</div>
                        )}
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-[#111827] truncate">{prod.name}</p>
                          <p className="text-[10px] text-slate-400 line-through">{formatMoney(prod.wholesalePrice)}</p>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <p className="text-xs font-black text-[#DB2777]">{formatMoney(discountedPrice)}</p>
                        <span className="text-[9px] text-slate-400">/{prod.unit}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Custom Message */}
          <div className="space-y-1">
            <label className="text-xs font-black text-[#111827]">Qo'shimcha izoh / xabar</label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Masalan: To'g'ridan-to'g'ri ishlab chiqaruvchidan birinchi partiyaga maxsus narx va bepul yetkazib berish..."
              rows={2}
              className="w-full bg-slate-100 rounded-2xl p-3 text-xs font-medium outline-none focus:ring-2 focus:ring-[#DB2777]/30 resize-none"
            />
          </div>

          {/* Footer Action */}
          <button
            type="submit"
            disabled={isSubmitting || selectedProductIds.length === 0}
            className="w-full py-3.5 rounded-2xl bg-[#DB2777] hover:bg-[#BE185D] text-white font-black text-sm shadow-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Send className="w-4 h-4" /> Taklifni yuborish</>}
          </button>
        </form>
      </div>
    </div>
  );
};
