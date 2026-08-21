import React, { useEffect, useState } from 'react';
import { Search, CheckCircle2, ShoppingBag, ArrowRight, ShieldCheck } from 'lucide-react';
import { useAgroStore } from '../../store/useAgroStore';
import { categoriesForScope } from '../../utils/categoryScope';
import { b2bRepository } from '../../api/b2bRepository';
import { B2BProduct, SupplierProfile } from '../../api/types';
import { B2BProductCard } from './B2BProductCard';

export const B2BHomeView: React.FC = () => {
  const { categories: allCategories, setB2BRoute, businessProfile, supplierProfile, isAuthenticated, setAuthPromptOpen } = useAgroStore();
  const categories = categoriesForScope(allCategories, 'market').filter((c) => c.id !== 'all');

  const [searchTerm, setSearchTerm] = useState('');
  const [popularProducts, setPopularProducts] = useState<B2BProduct[]>([]);
  const [newProducts, setNewProducts] = useState<B2BProduct[]>([]);
  const [suppliers, setSuppliers] = useState<SupplierProfile[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    Promise.all([b2bRepository.listB2BProducts(), b2bRepository.listVerifiedSuppliers()]).then(([products, sup]) => {
      if (cancelled) return;
      setPopularProducts(products.slice(0, 8));
      setNewProducts([...products].reverse().slice(0, 8));
      setSuppliers(sup.slice(0, 6));
      setIsLoading(false);
    });
    return () => { cancelled = true; };
  }, []);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setB2BRoute({ view: 'products' });
  };

  return (
    <div className="w-full max-w-170 mx-auto py-3 px-3 space-y-5 select-none pb-20">
      {/* Hero */}
      <div className="relative overflow-hidden bg-gradient-to-br from-[#1e1033] via-[#2d1b4e] to-[#1a0f2e] rounded-[24px] p-5 text-white space-y-3">
        <div className="pointer-events-none absolute -right-10 -top-16 h-52 w-52 rounded-full bg-[#DB2777]/20 blur-3xl" />
        <div className="pointer-events-none absolute -left-16 bottom-0 h-48 w-48 rounded-full bg-[#7c3aed]/25 blur-3xl" />

        <div className="relative space-y-3">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-400/15 border border-emerald-400/30 px-2.5 py-1 text-[10px] font-black uppercase tracking-wide text-emerald-300">
            <ShieldCheck className="w-3 h-3" /> Tasdiqlangan supplierlar
          </span>
          <div className="flex items-center gap-2">
            <ShoppingBag className="w-5 h-5 text-[#DB2777]" />
            <h1 className="font-black text-lg">Onbozar B2B</h1>
          </div>
          <p className="text-xs text-white/70 font-medium max-w-sm">
            Do'koningiz uchun mahsulotlarni ulgurji narxda toping — ishlab chiqaruvchi va distributorlardan to'g'ridan-to'g'ri.
          </p>
          <form onSubmit={handleSearchSubmit} className="relative">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Mahsulot, brend yoki supplier qidirish"
              className="w-full bg-white/10 border border-white/20 rounded-2xl pl-10 pr-4 py-3 text-sm text-white placeholder:text-white/40 outline-none focus:ring-2 focus:ring-[#DB2777]/40"
            />
          </form>
          {!isAuthenticated ? (
            <button onClick={() => setAuthPromptOpen(true)} className="text-xs font-bold text-white/90 underline underline-offset-2">
              Biznes sifatida qo'shilish uchun kiring
            </button>
          ) : !businessProfile && !supplierProfile ? (
            <button onClick={() => setB2BRoute({ view: 'business' })} className="flex items-center gap-1.5 text-xs font-black text-[#DB2777] bg-white rounded-xl px-3 py-2 w-fit">
              Biznes sifatida qo'shilish <ArrowRight className="w-3.5 h-3.5" />
            </button>
          ) : supplierProfile ? (
            <button onClick={() => setB2BRoute({ view: 'dashboard' })} className="flex items-center gap-1.5 text-xs font-black text-[#DB2777] bg-white rounded-xl px-3 py-2 w-fit">
              Supplier panelim <ArrowRight className="w-3.5 h-3.5" />
            </button>
          ) : (
            <button onClick={() => setB2BRoute({ view: 'orders' })} className="flex items-center gap-1.5 text-xs font-black text-[#DB2777] bg-white rounded-xl px-3 py-2 w-fit">
              Buyurtmalarim <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

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
    </div>
  );
};
