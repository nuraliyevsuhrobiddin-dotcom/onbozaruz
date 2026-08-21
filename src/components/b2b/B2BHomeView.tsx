import React, { useEffect, useState } from 'react';
import { Search, CheckCircle2, ShoppingBag, ArrowRight, ShieldCheck, ShoppingCart, Package, Building2, Store, MapPin, Sparkles, Gift } from 'lucide-react';
import { useAgroStore } from '../../store/useAgroStore';
import { categoriesForScope } from '../../utils/categoryScope';
import { b2bRepository } from '../../api/b2bRepository';
import { B2BProduct, SupplierProfile } from '../../api/types';
import { B2BProductCard } from './B2BProductCard';
import { B2BCashbackWalletModal } from './B2BCashbackWalletModal';

const formatMoney = (value: number) => `${value.toLocaleString('uz-UZ')} so'm`;

export const B2BHomeView: React.FC = () => {
  const {
    categories: allCategories,
    setB2BRoute,
    b2bCart,
    b2bOrders,
    fetchB2BOrders,
    b2bCashbackBalance,
    fetchB2BCashbackBalance,
    b2bCashbackRate,
    businessProfile,
    supplierProfile,
    isAuthenticated,
    setAuthPromptOpen,
  } = useAgroStore();
  const categories = categoriesForScope(allCategories, 'market').filter((c) => c.id !== 'all');

  const [searchTerm, setSearchTerm] = useState('');
  const [popularProducts, setPopularProducts] = useState<B2BProduct[]>([]);
  const [newProducts, setNewProducts] = useState<B2BProduct[]>([]);
  const [suppliers, setSuppliers] = useState<SupplierProfile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isWalletModalOpen, setIsWalletModalOpen] = useState(false);

  const cartTotalQty = Object.values(b2bCart).reduce((sum, item) => sum + item.quantity, 0);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    if (isAuthenticated) {
      void fetchB2BOrders();
      if (businessProfile) {
        void fetchB2BCashbackBalance();
      }
    }
    Promise.all([b2bRepository.listB2BProducts(), b2bRepository.listVerifiedSuppliers()]).then(([products, sup]) => {
      if (cancelled) return;
      setPopularProducts(products.slice(0, 8));
      setNewProducts([...products].reverse().slice(0, 8));
      setSuppliers(sup.slice(0, 6));
      setIsLoading(false);
    });
    return () => { cancelled = true; };
  }, [isAuthenticated, businessProfile, fetchB2BOrders, fetchB2BCashbackBalance]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setB2BRoute({ view: 'products' });
  };

  return (
    <div className="relative w-full max-w-170 mx-auto py-3 px-3 space-y-4 select-none pb-28">
      {/* Top Header Bar */}
      <div className="flex items-center justify-between bg-white rounded-2xl p-3 border border-slate-200/80 shadow-xs">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#DB2777] to-[#9D174D] flex items-center justify-center text-white shadow-xs">
            <ShoppingBag className="w-5 h-5" />
          </div>
          <div>
            <h1 className="font-black text-sm text-[#111827] leading-tight">OnBozor B2B</h1>
            <p className="text-[10px] text-slate-400 font-semibold">Ulgurji savdo maydoni</p>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          {/* Xarita Button */}
          <button
            onClick={() => setB2BRoute({ view: 'map' })}
            title="Do'konlar Xaritasi"
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-pink-50 hover:bg-pink-100 text-[#DB2777] transition-colors text-xs font-bold"
          >
            <MapPin className="w-4 h-4" />
            <span className="hidden sm:inline">Xarita</span>
          </button>

          {/* Buyurtmalarim Button */}
          <button
            onClick={() => {
              if (!isAuthenticated) {
                setAuthPromptOpen(true);
              } else {
                setB2BRoute({ view: 'orders' });
              }
            }}
            title="Buyurtmalarim"
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors text-xs font-bold relative"
          >
            <Package className="w-4 h-4 text-slate-700" />
            <span className="hidden sm:inline">Buyurtmalar</span>
            {b2bOrders.length > 0 && (
              <span className="w-4.5 h-4.5 rounded-full bg-slate-800 text-white text-[9px] font-black flex items-center justify-center">
                {b2bOrders.length}
              </span>
            )}
          </button>

          {/* Savat Button */}
          <button
            onClick={() => setB2BRoute({ view: 'cart' })}
            title="Savatcha"
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#111827] hover:bg-black text-white transition-colors text-xs font-black relative shadow-xs cursor-pointer"
          >
            <ShoppingCart className="w-4 h-4 text-white" />
            <span className="inline font-bold">Savat</span>
            {cartTotalQty > 0 ? (
              <span className="min-w-[18px] h-4.5 px-1 rounded-full bg-[#DB2777] text-white text-[9px] font-black flex items-center justify-center animate-pulse">
                {cartTotalQty}
              </span>
            ) : (
              <span className="text-[10px] text-white/70 font-medium">0</span>
            )}
          </button>
        </div>
      </div>

      {/* Hero */}
      <div className="relative overflow-hidden bg-gradient-to-br from-[#1e1033] via-[#2d1b4e] to-[#1a0f2e] rounded-[24px] p-5 text-white space-y-3.5">
        <div className="pointer-events-none absolute -right-10 -top-16 h-52 w-52 rounded-full bg-[#DB2777]/20 blur-3xl" />
        <div className="pointer-events-none absolute -left-16 bottom-0 h-48 w-48 rounded-full bg-[#7c3aed]/25 blur-3xl" />

        <div className="relative space-y-3">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-400/15 border border-emerald-400/30 px-2.5 py-1 text-[10px] font-black uppercase tracking-wide text-emerald-300">
              <ShieldCheck className="w-3 h-3" /> Tasdiqlangan supplierlar
            </span>
            {supplierProfile ? (
              <button
                onClick={() => setB2BRoute({ view: 'dashboard' })}
                className="flex items-center gap-1.5 text-[11px] font-bold text-pink-300 bg-pink-950/50 border border-pink-500/30 rounded-xl px-2.5 py-1"
              >
                <Building2 className="w-3.5 h-3.5" /> Supplier paneli
              </button>
            ) : businessProfile ? (
              <div className="flex items-center gap-2">
                <span className="flex items-center gap-1.5 text-[11px] font-bold text-slate-300 bg-white/10 rounded-xl px-2.5 py-1">
                  <Store className="w-3.5 h-3.5 text-emerald-400" /> {businessProfile.storeName}
                </span>
                <button
                  onClick={() => setIsWalletModalOpen(true)}
                  className="flex items-center gap-1 text-[11px] font-black text-emerald-300 bg-emerald-950/70 hover:bg-emerald-900 border border-emerald-500/40 rounded-xl px-2.5 py-1 transition-colors cursor-pointer shadow-xs"
                >
                  <Sparkles className="w-3 h-3 text-emerald-400 animate-pulse" /> Keshbek: {formatMoney(b2bCashbackBalance)}
                </button>
              </div>
            ) : null}
          </div>

          <h1 className="font-black text-xl leading-tight">Ulgurji narxlarda xarid qiling</h1>
          <p className="text-xs text-white/70 font-medium max-w-md">
            Do'koningiz uchun to'g'ridan-to'g'ri ishlab chiqaruvchi va rasmiy distribyutorlardan {b2bCashbackRate}% keshbek bilan xarid qiling.
          </p>

          <form onSubmit={handleSearchSubmit} className="relative">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Mahsulot, brend yoki ishlab chiqaruvchi qidirish"
              className="w-full bg-white/10 border border-white/20 rounded-2xl pl-10 pr-4 py-3 text-sm text-white placeholder:text-white/40 outline-none focus:ring-2 focus:ring-[#DB2777]/40"
            />
          </form>

          <div className="flex items-center gap-2 pt-1 flex-wrap">
            {!isAuthenticated ? (
              <button onClick={() => setAuthPromptOpen(true)} className="flex items-center gap-1.5 text-xs font-black text-[#DB2777] bg-white hover:bg-pink-50 rounded-xl px-3.5 py-2 transition-colors">
                Biznes sifatida kirish <ArrowRight className="w-3.5 h-3.5" />
              </button>
            ) : !businessProfile && !supplierProfile ? (
              <button onClick={() => setB2BRoute({ view: 'business' })} className="flex items-center gap-1.5 text-xs font-black text-[#DB2777] bg-white hover:bg-pink-50 rounded-xl px-3.5 py-2 transition-colors">
                Biznes sifatida qo'shilish <ArrowRight className="w-3.5 h-3.5" />
              </button>
            ) : null}

            <button
              onClick={() => setB2BRoute({ view: 'map' })}
              className="flex items-center gap-1.5 text-xs font-bold text-white bg-[#DB2777] hover:bg-[#BE185D] rounded-xl px-3.5 py-2 transition-colors shadow-md"
            >
              <MapPin className="w-3.5 h-3.5" /> Do'konlar xaritasi
            </button>

            <button
              onClick={() => setB2BRoute({ view: 'products' })}
              className="flex items-center gap-1.5 text-xs font-bold text-white bg-white/15 hover:bg-white/25 rounded-xl px-3.5 py-2 transition-colors"
            >
              Katalog <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Quick Navigation Shortcuts */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
        <button
          onClick={() => setB2BRoute({ view: 'map' })}
          className="flex items-center gap-2.5 p-3 rounded-2xl bg-gradient-to-br from-pink-500/10 to-rose-500/5 border border-[#DB2777]/30 hover:border-[#DB2777] transition-all text-left group cursor-pointer"
        >
          <div className="w-8 h-8 rounded-xl bg-[#DB2777] text-white flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform shadow-xs">
            <MapPin className="w-4 h-4" />
          </div>
          <div>
            <span className="block text-xs font-extrabold text-[#111827]">Do'konlar xaritasi</span>
            <span className="block text-[10px] text-[#DB2777] font-bold">Xaritada ko'rish</span>
          </div>
        </button>

        <button
          onClick={() => setB2BRoute({ view: 'products' })}
          className="flex items-center gap-2.5 p-3 rounded-2xl bg-white border border-slate-200/80 hover:border-[#DB2777]/40 transition-colors text-left cursor-pointer"
        >
          <div className="w-8 h-8 rounded-xl bg-pink-50 text-[#DB2777] flex items-center justify-center shrink-0">
            <ShoppingBag className="w-4 h-4" />
          </div>
          <div>
            <span className="block text-xs font-extrabold text-[#111827]">Mahsulotlar</span>
            <span className="block text-[10px] text-slate-400 font-medium">Barcha katalog</span>
          </div>
        </button>

        <button
          onClick={() => setB2BRoute({ view: 'suppliers' })}
          className="flex items-center gap-2.5 p-3 rounded-2xl bg-white border border-slate-200/80 hover:border-[#DB2777]/40 transition-colors text-left cursor-pointer"
        >
          <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
            <Building2 className="w-4 h-4" />
          </div>
          <div>
            <span className="block text-xs font-extrabold text-[#111827]">Supplierlar</span>
            <span className="block text-[10px] text-slate-400 font-medium">Ishlab chiqaruvchilar</span>
          </div>
        </button>

        <button
          onClick={() => setB2BRoute({ view: 'cart' })}
          className="flex items-center gap-2.5 p-3 rounded-2xl bg-white border border-slate-200/80 hover:border-[#DB2777]/40 transition-colors text-left cursor-pointer"
        >
          <div className="w-8 h-8 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0 relative">
            <ShoppingCart className="w-4 h-4" />
            {cartTotalQty > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-[#DB2777] text-white text-[8px] font-black flex items-center justify-center">
                {cartTotalQty}
              </span>
            )}
          </div>
          <div>
            <span className="block text-xs font-extrabold text-[#111827]">Savatcha</span>
            <span className="block text-[10px] text-slate-400 font-medium">{cartTotalQty > 0 ? `${cartTotalQty} ta mahsulot` : "Bo'sh"}</span>
          </div>
        </button>

        <button
          onClick={() => {
            if (!isAuthenticated) {
              setAuthPromptOpen(true);
            } else {
              setB2BRoute({ view: 'orders' });
            }
          }}
          className="flex items-center gap-2.5 p-3 rounded-2xl bg-white border border-slate-200/80 hover:border-[#DB2777]/40 transition-colors text-left cursor-pointer"
        >
          <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <Package className="w-4 h-4" />
          </div>
          <div>
            <span className="block text-xs font-extrabold text-[#111827]">Buyurtmalarim</span>
            <span className="block text-[10px] text-slate-400 font-medium">{b2bOrders.length > 0 ? `${b2bOrders.length} ta buyurtma` : 'Tarix'}</span>
          </div>
        </button>
      </div>

      {/* Floating Bottom Cart Bar when cart has items */}
      {cartTotalQty > 0 && (
        <div className="fixed bottom-18 lg:bottom-6 left-3 right-3 max-w-lg mx-auto z-40 animate-in slide-in-from-bottom-4 duration-200">
          <button
            onClick={() => setB2BRoute({ view: 'cart' })}
            className="w-full py-3 px-4.5 rounded-2xl bg-[#111827] hover:bg-black text-white flex items-center justify-between shadow-2xl border border-white/20 cursor-pointer"
          >
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-[#DB2777] flex items-center justify-center text-white shrink-0">
                <ShoppingCart className="w-4 h-4" />
              </div>
              <div className="text-left">
                <span className="block text-xs font-black">Savatchada {cartTotalQty} ta mahsulot</span>
                <span className="block text-[10px] text-slate-300 font-medium">Buyurtmani rasmiylashtirish</span>
              </div>
            </div>
            <div className="flex items-center gap-1.5 text-xs font-black text-white bg-[#DB2777] hover:bg-[#BE185D] px-3 py-1.5 rounded-xl shadow-xs">
              <span>Savatga o'tish</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </div>
          </button>
        </div>
      )}



      {/* Categories */}
      <div className="space-y-2">
        <h2 className="font-black text-sm text-[#111827] px-1">Kategoriyalar</h2>
        <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setB2BRoute({ view: 'products' })}
              className="shrink-0 min-w-[92px] rounded-[16px] border border-slate-200/80 bg-white px-3 py-2.5 text-center hover:border-[#DB2777]/40 transition-colors"
            >
              <span className="block text-xs font-extrabold text-slate-800">{cat.name}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Popular products */}
      <div className="space-y-2">
        <div className="flex items-center justify-between px-1">
          <h2 className="font-black text-sm text-[#111827]">🔥 Mashhur ulgurji mahsulotlar</h2>
          <button onClick={() => setB2BRoute({ view: 'products' })} className="text-[11px] font-bold text-[#DB2777]">Barchasi</button>
        </div>
        {isLoading ? (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            {Array.from({ length: 4 }).map((_, i) => <div key={i} className="aspect-[3/4.2] rounded-[20px] bg-slate-100 animate-pulse" />)}
          </div>
        ) : popularProducts.length === 0 ? (
          <p className="text-xs text-slate-400 font-medium px-1 py-6 text-center">Hozircha mahsulotlar mavjud emas.</p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            {popularProducts.map((p) => <B2BProductCard key={p.id} product={p} />)}
          </div>
        )}
      </div>

      {/* Verified suppliers */}
      <div className="space-y-2">
        <div className="flex items-center justify-between px-1">
          <h2 className="font-black text-sm text-[#111827]">🏭 Tasdiqlangan ishlab chiqaruvchilar</h2>
          <button onClick={() => setB2BRoute({ view: 'suppliers' })} className="text-[11px] font-bold text-[#DB2777]">Barchasi</button>
        </div>
        {suppliers.length === 0 ? (
          <p className="text-xs text-slate-400 font-medium px-1 py-6 text-center">Hozircha supplierlar mavjud emas.</p>
        ) : (
          <div className="flex gap-2.5 overflow-x-auto no-scrollbar pb-1">
            {suppliers.map((s) => (
              <button
                key={s.id}
                onClick={() => setB2BRoute({ view: 'supplier', id: s.id })}
                className="shrink-0 w-40 rounded-[18px] border border-slate-200/80 bg-white p-3 text-left space-y-1.5 hover:border-[#DB2777]/40 transition-colors"
              >
                <div className="w-10 h-10 rounded-full bg-slate-100 overflow-hidden flex items-center justify-center text-slate-400 font-black">
                  {s.logoUrl ? <img src={s.logoUrl} alt={s.companyName} className="w-full h-full object-cover" /> : s.companyName.charAt(0)}
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-xs font-bold text-[#111827] truncate">{s.companyName}</span>
                  <CheckCircle2 className="w-3 h-3 text-blue-500 shrink-0" />
                </div>
                <span className="text-[10px] text-slate-400 font-medium block truncate">{s.region || 'O\'zbekiston'}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* New products */}
      <div className="space-y-2">
        <h2 className="font-black text-sm text-[#111827] px-1">🆕 Yangi mahsulotlar</h2>
        {newProducts.length === 0 ? (
          <p className="text-xs text-slate-400 font-medium px-1 py-6 text-center">Hozircha mahsulotlar mavjud emas.</p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            {newProducts.map((p) => <B2BProductCard key={p.id} product={p} />)}
          </div>
        )}
      </div>

      {/* Cashback Wallet & History Modal */}
      {isWalletModalOpen && (
        <B2BCashbackWalletModal onClose={() => setIsWalletModalOpen(false)} />
      )}
    </div>
  );
};
