import React, { useEffect, useState } from 'react';
import {
  Search, CheckCircle2, ShoppingBag, ArrowRight, ShieldCheck,
  ShoppingCart, Package, Building2, Store, MapPin, Sparkles,
  TrendingUp, Zap, ChevronRight,
} from 'lucide-react';
import { useAgroStore } from '../../store/useAgroStore';
import { categoriesForScope } from '../../utils/categoryScope';
import { b2bRepository } from '../../api/b2bRepository';
import { B2BProduct, SupplierProfile } from '../../api/types';
import { B2BProductCard } from './B2BProductCard';
import { B2BCashbackWalletModal } from './B2BCashbackWalletModal';
import { formatMoney } from '../../utils/b2bUtils';

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
    <div className="relative w-full max-w-170 mx-auto py-3 px-3 space-y-4 select-none pb-28 bg-slate-50 text-slate-900">

      {/* ── Top Header Bar ── */}
      <div className="flex items-center justify-between bg-white rounded-2xl p-3 border border-slate-200 shadow-sm">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-[#DB2777] flex items-center justify-center text-white shadow-lg shadow-pink-500/20">
            <ShoppingBag className="w-4.5 h-4.5" />
          </div>
          <div>
            <h1 className="font-black text-sm text-slate-900 leading-tight">OnBozar B2B</h1>
            <p className="text-[10px] text-slate-500 font-semibold">Ulgurji savdo maydoni</p>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setB2BRoute({ view: 'map' })}
            title="Do'konlar Xaritasi"
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-pink-50 hover:bg-pink-100 text-[#DB2777] transition-colors text-xs font-bold border border-pink-100"
          >
            <MapPin className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Xarita</span>
          </button>
          <button
            onClick={() => { if (!isAuthenticated) { setAuthPromptOpen(true); } else { setB2BRoute({ view: 'orders' }); } }}
            title="Buyurtmalarim"
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-700 transition-colors text-xs font-bold relative border border-slate-200"
          >
            <Package className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Buyurtmalar</span>
            {b2bOrders.length > 0 && (
              <span className="w-4.5 h-4.5 rounded-full bg-amber-400 text-slate-900 text-[9px] font-black flex items-center justify-center">
                {b2bOrders.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setB2BRoute({ view: 'cart' })}
            title="Savatcha"
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#DB2777] hover:bg-[#be185d] text-white transition-colors text-xs font-black relative shadow-lg shadow-pink-500/20 cursor-pointer border border-pink-500"
          >
            <ShoppingCart className="w-3.5 h-3.5" />
            <span className="font-bold">Savat</span>
            {cartTotalQty > 0
              ? <span className="min-w-[18px] h-4.5 px-1 rounded-full bg-amber-400 text-slate-900 text-[9px] font-black flex items-center justify-center">{cartTotalQty}</span>
              : <span className="text-[10px] text-pink-100 font-medium">0</span>
            }
          </button>
        </div>
      </div>

      {/* ── Hero Banner ── */}
      <div className="relative overflow-hidden bg-gradient-to-br from-[#1a0f2e] via-[#2b1547] to-[#3b1330] rounded-3xl p-5 text-white space-y-4 shadow-xl shadow-[#1a0f2e]/20">
        {/* Glow effects */}
        <div className="pointer-events-none absolute -right-12 -top-12 h-56 w-56 rounded-full bg-[#DB2777]/25 blur-3xl" />
        <div className="pointer-events-none absolute -left-12 bottom-0 h-48 w-48 rounded-full bg-violet-600/25 blur-3xl" />
        <div className="pointer-events-none absolute right-1/4 top-1/2 h-32 w-32 rounded-full bg-amber-400/15 blur-2xl" />

        <div className="relative space-y-3.5">
          {/* Badges row */}
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-400/15 border border-emerald-400/30 px-2.5 py-1 text-[10px] font-black uppercase tracking-wide text-emerald-300">
              <ShieldCheck className="w-3 h-3" /> Tasdiqlangan supplierlar
            </span>
            {supplierProfile
              ? (
                <button
                  onClick={() => setB2BRoute({ view: 'dashboard' })}
                  className="flex items-center gap-1.5 text-[11px] font-bold text-pink-200 bg-pink-500/15 border border-pink-400/30 rounded-xl px-2.5 py-1 hover:bg-pink-500/25 transition-colors"
                >
                  <Building2 className="w-3.5 h-3.5" /> Supplier paneli
                </button>
              )
              : businessProfile
                ? (
                  <div className="flex items-center gap-2">
                    <span className="flex items-center gap-1.5 text-[11px] font-bold text-white bg-white/10 rounded-xl px-2.5 py-1 border border-white/15">
                      <Store className="w-3.5 h-3.5 text-emerald-300" /> {businessProfile.storeName}
                    </span>
                    <button
                      onClick={() => setIsWalletModalOpen(true)}
                      className="flex items-center gap-1 text-[11px] font-black text-emerald-300 bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-400/30 rounded-xl px-2.5 py-1 transition-colors cursor-pointer"
                    >
                      <Sparkles className="w-3 h-3 text-emerald-300 animate-pulse" /> Keshbek: {formatMoney(b2bCashbackBalance)}
                    </button>
                  </div>
                )
                : null
            }
          </div>

          {/* Headline */}
          <div>
            <h1 className="font-black text-2xl leading-tight text-white">
              Ulgurji narxlarda
              <span className="block text-[#F472B6]">
                xarid qiling
              </span>
            </h1>
            <p className="text-xs text-white/70 font-medium mt-1.5 max-w-md">
              Do'koningiz uchun to'g'ridan-to'g'ri ishlab chiqaruvchi va rasmiy distribyutorlardan{' '}
              <span className="text-amber-300 font-bold">{b2bCashbackRate}% keshbek</span> bilan xarid qiling.
            </p>
          </div>

          {/* Search */}
          <form onSubmit={handleSearchSubmit} className="relative">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-white/50" />
            <input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Mahsulot, brend yoki ishlab chiqaruvchi..."
              className="w-full bg-white/10 border border-white/20 rounded-2xl pl-10 pr-4 py-3 text-sm text-white placeholder:text-white/40 outline-none focus:ring-2 focus:ring-pink-400/40 focus:border-pink-400/50 transition-all"
            />
          </form>

          {/* CTA Buttons */}
          <div className="flex items-center gap-2 flex-wrap">
            {!isAuthenticated
              ? (
                <button
                  onClick={() => setAuthPromptOpen(true)}
                  className="flex items-center gap-1.5 text-xs font-black text-[#1a0f2e] bg-white hover:bg-pink-50 rounded-xl px-4 py-2.5 transition-all shadow-lg"
                >
                  Biznes sifatida kirish <ArrowRight className="w-3.5 h-3.5" />
                </button>
              )
              : !businessProfile && !supplierProfile
                ? (
                  <button
                    onClick={() => setB2BRoute({ view: 'business' })}
                    className="flex items-center gap-1.5 text-xs font-black text-[#1a0f2e] bg-white hover:bg-pink-50 rounded-xl px-4 py-2.5 transition-all shadow-lg"
                  >
                    Biznes sifatida qo'shilish <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                )
                : null
            }
            <button
              onClick={() => setB2BRoute({ view: 'map' })}
              className="flex items-center gap-1.5 text-xs font-bold text-white bg-[#DB2777] hover:bg-[#be185d] rounded-xl px-4 py-2.5 transition-colors shadow-lg shadow-pink-900/30"
            >
              <MapPin className="w-3.5 h-3.5" /> Do'konlar xaritasi
            </button>
            <button
              onClick={() => setB2BRoute({ view: 'products' })}
              className="flex items-center gap-1.5 text-xs font-bold text-white bg-white/10 hover:bg-white/20 rounded-xl px-4 py-2.5 transition-colors border border-white/15"
            >
              Katalog <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* ── Quick Nav Cards ── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5">
        {[
          {
            label: "Do'konlar xaritasi", sub: 'GPS bilan', icon: <MapPin className="w-4 h-4" />,
            badge: 'GPS', badgeCls: 'bg-pink-50 text-[#DB2777] border border-pink-200',
            iconBg: 'bg-[#DB2777] shadow-pink-500/20',
            onClick: () => setB2BRoute({ view: 'map' }),
          },
          {
            label: 'Mahsulotlar', sub: 'Barcha katalog', icon: <ShoppingBag className="w-4 h-4" />,
            badge: null, badgeCls: '',
            iconBg: 'bg-fuchsia-600 shadow-fuchsia-500/20',
            onClick: () => setB2BRoute({ view: 'products' }),
          },
          {
            label: 'Supplierlar', sub: 'Ishlab chiqaruvchi', icon: <Building2 className="w-4 h-4" />,
            badge: null, badgeCls: '',
            iconBg: 'bg-violet-600 shadow-violet-500/20',
            onClick: () => setB2BRoute({ view: 'suppliers' }),
          },
          {
            label: 'Savatcha', sub: cartTotalQty > 0 ? `${cartTotalQty} ta mahsulot` : "Bo'sh",
            icon: <ShoppingCart className="w-4 h-4" />,
            badge: cartTotalQty > 0 ? String(cartTotalQty) : null,
            badgeCls: 'bg-amber-400/20 text-amber-400 border border-amber-400/25',
            iconBg: 'bg-amber-500 shadow-amber-500/20',
            onClick: () => setB2BRoute({ view: 'cart' }),
          },
          {
            label: 'Buyurtmalarim', sub: b2bOrders.length > 0 ? `${b2bOrders.length} ta buyurtma` : 'Tarix',
            icon: <Package className="w-4 h-4" />,
            badge: b2bOrders.length > 0 ? `${b2bOrders.length} ta` : null,
            badgeCls: 'bg-emerald-400/20 text-emerald-400 border border-emerald-400/25',
            iconBg: 'bg-emerald-600 shadow-emerald-500/20',
            onClick: () => { if (!isAuthenticated) { setAuthPromptOpen(true); } else { setB2BRoute({ view: 'orders' }); } },
          },
        ].map((item) => (
          <button
            key={item.label}
            onClick={item.onClick}
            className="group flex flex-col justify-between p-3 rounded-2xl bg-white border border-slate-200 hover:border-pink-300 hover:shadow-[0_0_20px_rgba(219,39,119,0.1)] transition-all text-left cursor-pointer min-h-[92px]"
          >
            <div className="w-full flex items-center justify-between">
              <div className={`w-8 h-8 rounded-xl text-white flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform shadow-lg ${item.iconBg}`}>
                {item.icon}
              </div>
              {item.badge && (
                <span className={`px-1.5 py-0.5 rounded-full text-[9px] font-black ${item.badgeCls}`}>
                  {item.badge}
                </span>
              )}
            </div>
            <div className="mt-2 w-full">
              <span className="block text-xs font-black text-slate-800 leading-tight truncate">{item.label}</span>
              <span className="block text-[10px] text-slate-500 font-medium truncate mt-0.5">{item.sub}</span>
            </div>
          </button>
        ))}
      </div>

      {/* ── Floating Cart Bar ── */}
      {cartTotalQty > 0 && (
        <div className="fixed bottom-18 lg:bottom-6 left-3 right-3 max-w-lg mx-auto z-40 animate-in slide-in-from-bottom-4 duration-200">
          <button
            onClick={() => setB2BRoute({ view: 'cart' })}
            className="w-full py-3 px-4.5 rounded-2xl bg-white hover:bg-slate-50 text-slate-900 flex items-center justify-between shadow-xl border border-pink-200 cursor-pointer"
          >
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-[#DB2777] flex items-center justify-center text-white shrink-0 shadow-lg shadow-pink-500/20">
                <ShoppingCart className="w-4 h-4" />
              </div>
              <div className="text-left">
                <span className="block text-xs font-black">Savatchada {cartTotalQty} ta mahsulot</span>
                <span className="block text-[10px] text-slate-400 font-medium">Buyurtmani rasmiylashtirish</span>
              </div>
            </div>
            <div className="flex items-center gap-1.5 text-xs font-black text-white bg-[#DB2777] hover:bg-[#be185d] px-3 py-1.5 rounded-xl shadow-lg shadow-pink-500/20 transition-colors">
              <span>Savatga</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </div>
          </button>
        </div>
      )}

      {/* ── Categories ── */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between px-1">
          <h2 className="font-black text-sm text-slate-900 flex items-center gap-1.5">
            <Zap className="w-4 h-4 text-amber-500" /> Kategoriyalar
          </h2>
        </div>
        <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setB2BRoute({ view: 'products' })}
              className="shrink-0 min-w-[88px] rounded-xl bg-white border border-slate-200 px-3 py-2.5 text-center hover:border-blue-300 hover:shadow-sm transition-all"
            >
              <span className="block text-[11px] font-extrabold text-slate-700">{cat.name}</span>
            </button>
          ))}
        </div>
      </div>

      {/* ── Popular products ── */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between px-1">
          <h2 className="font-black text-sm text-slate-900 flex items-center gap-1.5">
            <TrendingUp className="w-4 h-4 text-blue-600" /> Mashhur mahsulotlar
          </h2>
          <button
            onClick={() => setB2BRoute({ view: 'products' })}
            className="flex items-center gap-1 text-[11px] font-bold text-blue-600 hover:text-blue-700 transition-colors"
          >
            Barchasi <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
        {isLoading
          ? (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="aspect-[3/4.2] rounded-2xl bg-white animate-pulse border border-slate-200" />
              ))}
            </div>
          )
          : popularProducts.length === 0
            ? (
              <p className="text-xs text-slate-500 font-medium px-1 py-6 text-center">
                Hozircha mahsulotlar mavjud emas.
              </p>
            )
            : (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                {popularProducts.map((p) => <B2BProductCard key={p.id} product={p} />)}
              </div>
            )
        }
      </div>

      {/* ── Verified Suppliers ── */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between px-1">
          <h2 className="font-black text-sm text-slate-900 flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-600" /> Tasdiqlangan supplierlar
          </h2>
          <button
            onClick={() => setB2BRoute({ view: 'suppliers' })}
            className="flex items-center gap-1 text-[11px] font-bold text-blue-600 hover:text-blue-700 transition-colors"
          >
            Barchasi <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
        {suppliers.length === 0
          ? <p className="text-xs text-slate-500 font-medium px-1 py-6 text-center">Hozircha supplierlar mavjud emas.</p>
          : (
            <div className="flex gap-2.5 overflow-x-auto no-scrollbar pb-1">
              {suppliers.map((s) => (
                <button
                  key={s.id}
                  onClick={() => setB2BRoute({ view: 'supplier', id: s.id })}
                  className="group shrink-0 w-44 rounded-2xl bg-white border border-slate-200 p-3.5 text-left space-y-2.5 hover:border-blue-300 hover:shadow-sm transition-all"
                >
                  <div className="w-11 h-11 rounded-xl bg-slate-100 overflow-hidden flex items-center justify-center text-slate-500 font-black text-lg border border-slate-200">
                    {s.logoUrl
                      ? <img src={s.logoUrl} alt={s.companyName} className="w-full h-full object-cover" />
                      : s.companyName.charAt(0)
                    }
                  </div>
                  <div>
                    <div className="flex items-center gap-1">
                      <span className="text-[12px] font-bold text-slate-800 truncate">{s.companyName}</span>
                      <CheckCircle2 className="w-3 h-3 text-blue-500 shrink-0" />
                    </div>
                    <span className="text-[10px] text-slate-400 font-medium block truncate mt-0.5">
                      {s.region || "O'zbekiston"}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          )
        }
      </div>

      {/* ── New Products ── */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between px-1">
          <h2 className="font-black text-sm text-slate-900 flex items-center gap-1.5">
            <Sparkles className="w-4 h-4 text-violet-600" /> Yangi mahsulotlar
          </h2>
        </div>
        {newProducts.length === 0
          ? <p className="text-xs text-slate-500 font-medium px-1 py-6 text-center">Hozircha mahsulotlar mavjud emas.</p>
          : (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              {newProducts.map((p) => <B2BProductCard key={p.id} product={p} />)}
            </div>
          )
        }
      </div>

      {isWalletModalOpen && <B2BCashbackWalletModal onClose={() => setIsWalletModalOpen(false)} />}
    </div>
  );
};
