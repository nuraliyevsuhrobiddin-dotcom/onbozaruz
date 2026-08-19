import React, { useState } from 'react';
import {
  ArrowLeft,
  ShieldCheck,
  Package,
  Clock,
  Users,
  CheckCircle,
  XCircle,
  Plus,
  Loader2,
} from 'lucide-react';
import { Product } from '../../data/mockAgroData';

interface ProfileAdminSubViewProps {
  onBack: () => void;
  pendingProducts: Product[];
  approvedProducts: Product[];
  ordersCount: number;
  onApproveProduct: (id: string) => void;
  onRejectProduct: (id: string) => void;
  onAddAdminProduct: (product: Partial<Product>) => Promise<void>;
  showToast: (msg: string) => void;
}

export const ProfileAdminSubView: React.FC<ProfileAdminSubViewProps> = ({
  onBack,
  pendingProducts,
  approvedProducts,
  ordersCount,
  onApproveProduct,
  onRejectProduct,
  onAddAdminProduct,
  showToast,
}) => {
  const [isAdminProductModalOpen, setIsAdminProductModalOpen] = useState(false);
  const [isSubmittingProduct, setIsSubmittingProduct] = useState(false);

  const [adminProductForm, setAdminProductForm] = useState({
    title: '',
    seller: '',
    category: 'fruits',
    price: '',
    numericPrice: 0,
    minOrder: '1 dona',
    location: '',
    telegram: '',
    image: '',
    description: '',
  });

  const handleAdminProductSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminProductForm.title.trim() || !adminProductForm.price.trim()) {
      showToast("Sarlavha va narxni kiriting!");
      return;
    }

    setIsSubmittingProduct(true);
    try {
      // This form has no separate numeric-price input — derive it from the
      // price string the admin actually typed so sorting/cart math isn't
      // silently left at a stale/zero value that doesn't match what's shown.
      const parsedNumericPrice = Number(adminProductForm.price.replace(/[^0-9]/g, '')) || 0;
      await onAddAdminProduct({
        ...adminProductForm,
        numericPrice: parsedNumericPrice,
        images: [adminProductForm.image],
      });
      setIsAdminProductModalOpen(false);
      setAdminProductForm({
        title: '',
        seller: '',
        category: 'fruits',
        price: '',
        numericPrice: 0,
        minOrder: '1 dona',
        location: '',
        telegram: '',
        image: '',
        description: '',
      });
      showToast("Yangi shartnomaviy mahsulot yaratildi va tasdiqlandi!");
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : "Mahsulotni qo'shib bo'lmadi");
    } finally {
      setIsSubmittingProduct(false);
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto py-3 px-3.5 space-y-4 select-none pb-20">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-2 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="font-black text-lg text-[#111827] flex items-center gap-1.5">
              <ShieldCheck className="w-5 h-5 text-[#E53935]" />
              Boshqaruv paneli
            </h1>
            <p className="text-[11px] text-slate-400 font-medium">Bosh admin va moderatsiya markazi</p>
          </div>
        </div>
        <button
          onClick={() => setIsAdminProductModalOpen(true)}
          className="px-3.5 py-2 rounded-[16px] bg-[#E53935] hover:bg-[#C62828] text-white font-black text-xs shadow-md transition-colors flex items-center gap-1.5"
        >
          <Plus className="w-4 h-4" />
          <span>Shartnomaviy e'lon</span>
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-3 gap-2">
        {[
          { label: 'Buyurtmalar', val: ordersCount, unit: 'ta', icon: Package, tone: 'text-blue-600 bg-blue-50' },
          { label: 'Kutayotganlar', val: pendingProducts.length, unit: 'ta bot', icon: Clock, tone: 'text-amber-600 bg-amber-50' },
          { label: 'Faol mahsulotlar', val: approvedProducts.length, unit: 'ta', icon: Users, tone: 'text-rose-600 bg-rose-50' },
        ].map((s) => {
          const Icon = s.icon;
          return (
            <div key={s.label} className="bg-white rounded-[22px] border border-slate-200/80 p-3 shadow-sm space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-slate-400 uppercase">{s.label}</span>
                <span className={`w-7 h-7 rounded-[12px] ${s.tone} flex items-center justify-center`}>
                  <Icon className="w-3.5 h-3.5" />
                </span>
              </div>
              <div>
                <span className="font-black text-base text-[#111827]">{s.val}</span>
                <span className="text-[10px] text-slate-400 font-bold ml-1">{s.unit}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Moderation List */}
      <div className="bg-white rounded-[24px] border border-slate-200/80 p-4 shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-black text-sm text-[#111827] flex items-center gap-2">
            <Clock className="w-4 h-4 text-amber-500" />
            Telegram Bot / Foydalanuvchi e'lonlari ({pendingProducts.length})
          </h3>
        </div>

        {pendingProducts.length > 0 ? (
          <div className="space-y-2">
            {pendingProducts.map((p) => (
              <div key={p.id} className="p-3 rounded-[18px] border border-slate-200/80 bg-slate-50 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <img src={p.image} alt={p.title} className="w-12 h-12 rounded-[14px] object-cover shrink-0" />
                  <div className="min-w-0">
                    <h4 className="font-bold text-xs text-[#111827] truncate">{p.title}</h4>
                    <p className="text-[10px] text-slate-400 font-semibold">{p.seller} • {p.price}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    onClick={() => {
                      onApproveProduct(p.id);
                      showToast("E'lon tasdiqlandi!");
                    }}
                    className="p-2 rounded-full bg-emerald-100 hover:bg-emerald-200 text-emerald-700 transition-colors"
                    title="Tasdiqlash"
                  >
                    <CheckCircle className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => {
                      onRejectProduct(p.id);
                      showToast("E'lon rad etildi");
                    }}
                    className="p-2 rounded-full bg-red-100 hover:bg-red-200 text-red-700 transition-colors"
                    title="Rad etish"
                  >
                    <XCircle className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-6 text-xs text-slate-400 font-bold">
            Tasdiqlash kutilayotgan e'lonlar yo'q
          </div>
        )}
      </div>

      {/* Add Admin Product Modal */}
      {isAdminProductModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-[26px] max-w-lg w-full p-5 space-y-4 shadow-2xl animate-in fade-in zoom-in duration-200">
            <div className="flex items-center justify-between">
              <h3 className="font-black text-base text-[#111827]">Yangi shartnomaviy e'lon yaratish</h3>
              <button
                onClick={() => setIsAdminProductModalOpen(false)}
                className="p-1.5 rounded-full hover:bg-slate-100 text-slate-500"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAdminProductSubmit} className="space-y-3">
              <input
                placeholder="Mahsulot nomi (masalan: Farg'ona Qizil Olmasi)"
                value={adminProductForm.title}
                onChange={(e) => setAdminProductForm({ ...adminProductForm, title: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-[14px] border border-slate-200 text-xs font-bold"
              />
              <div className="grid grid-cols-2 gap-2">
                <input
                  placeholder="Sotuvchi (masalan: Alisher Agro)"
                  value={adminProductForm.seller}
                  onChange={(e) => setAdminProductForm({ ...adminProductForm, seller: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-[14px] border border-slate-200 text-xs font-bold"
                />
                <input
                  placeholder="Narxi (masalan: 12,500 so'm / kg)"
                  value={adminProductForm.price}
                  onChange={(e) => setAdminProductForm({ ...adminProductForm, price: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-[14px] border border-slate-200 text-xs font-bold"
                />
              </div>
              <input
                placeholder="Rasm URL havolasi"
                value={adminProductForm.image}
                onChange={(e) => setAdminProductForm({ ...adminProductForm, image: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-[14px] border border-slate-200 text-xs font-bold"
              />
              <textarea
                placeholder="Tavsif va shartlar..."
                value={adminProductForm.description}
                onChange={(e) => setAdminProductForm({ ...adminProductForm, description: e.target.value })}
                rows={3}
                className="w-full px-3.5 py-2.5 rounded-[14px] border border-slate-200 text-xs font-bold resize-none"
              />
              <button
                type="submit"
                disabled={isSubmittingProduct}
                className="w-full py-3 rounded-[16px] bg-[#E53935] text-white font-black text-xs hover:bg-[#C62828] transition-colors shadow-md flex items-center justify-center gap-2"
              >
                {isSubmittingProduct ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Yaratish va tasdiqlash'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
