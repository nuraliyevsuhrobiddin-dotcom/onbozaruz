import React, { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Search, X, SlidersHorizontal, ShoppingCart, Package } from 'lucide-react';
import { useAgroStore } from '../../store/useAgroStore';
import { categoriesForScope } from '../../utils/categoryScope';
import { REGIONS } from '../../data/mockAgroData';
import { b2bRepository, B2BProductFilters } from '../../api/b2bRepository';
import { B2BProduct } from '../../api/types';
import { B2BProductCard } from './B2BProductCard';

function useDebounced<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = window.setTimeout(() => setDebounced(value), delayMs);
    return () => window.clearTimeout(t);
  }, [value, delayMs]);
  return debounced;
}

export const B2BProductsListView: React.FC = () => {
  const { categories: allCategories, setB2BRoute, b2bCart, isAuthenticated, setAuthPromptOpen } = useAgroStore();
  const categories = categoriesForScope(allCategories, 'market').filter((c) => c.id !== 'all');

  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearch = useDebounced(searchTerm, 350);
  const [category, setCategory] = useState('all');
  const [region, setRegion] = useState('all');
  const [verifiedOnly, setVerifiedOnly] = useState(false);
  const [deliveryOnly, setDeliveryOnly] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [products, setProducts] = useState<B2BProduct[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const filters: B2BProductFilters = useMemo(() => ({
    search: debouncedSearch || undefined,
    category: category !== 'all' ? category : undefined,
    region: region !== 'all' ? region : undefined,
    verifiedOnly: verifiedOnly || undefined,
    deliveryOnly: deliveryOnly || undefined,
  }), [debouncedSearch, category, region, verifiedOnly, deliveryOnly]);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    b2bRepository.listB2BProducts(filters).then((list) => {
      if (!cancelled) { setProducts(list); setIsLoading(false); }
    });
    return () => { cancelled = true; };
  }, [filters]);

  const cartCount = Object.values(b2bCart).reduce((s, i) => s + i.quantity, 0);

  return (
    <div className="w-full max-w-170 mx-auto py-3 px-3 space-y-3 select-none pb-24">
      <div className="flex items-center gap-2.5">
        <button onClick={() => setB2BRoute({ view: 'home' })} className="p-2 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="font-black text-base sm:text-lg text-[#111827] truncate">Ulgurji mahsulotlar</h1>

        <div className="ml-auto flex items-center gap-1.5">
          <button
            onClick={() => {
              if (!isAuthenticated) {
                setAuthPromptOpen(true);
              } else {
                setB2BRoute({ view: 'orders' });
              }
            }}
            title="Buyurtmalarim"
            className="p-2 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
          >
            <Package className="w-4 h-4" />
          </button>

          <button
            onClick={() => setB2BRoute({ view: 'cart' })}
            title="Savat"
            className="relative p-2 rounded-full bg-[#111827] text-white hover:bg-black transition-colors"
          >
            <ShoppingCart className="w-4 h-4" />
            {cartCount > 0 && (
              <span className="absolute -top-1 -right-1 w-4.5 h-4.5 rounded-full bg-[#DB2777] text-white text-[9px] font-black flex items-center justify-center animate-pulse">
                {cartCount}
              </span>
            )}
          </button>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Mahsulot yoki brend qidirish"
            className="w-full bg-slate-100 rounded-2xl pl-10 pr-9 py-3 text-[13px] font-medium outline-none focus:ring-2 focus:ring-[#DB2777]/30"
          />
          {searchTerm && (
            <button onClick={() => setSearchTerm('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
        <button
          onClick={() => setShowFilters((v) => !v)}
          className={`p-3 rounded-2xl border shrink-0 ${showFilters ? 'bg-[#111827] text-white border-[#111827]' : 'bg-white text-slate-700 border-slate-200'}`}
        >
          <SlidersHorizontal className="w-[18px] h-[18px]" />
        </button>
      </div>

      {showFilters && (
        <div className="bg-white rounded-[20px] border border-slate-200/80 p-4 space-y-3 shadow-sm">
          <div>
            <label className="text-[11px] font-extrabold text-slate-500 uppercase block mb-1.5">Hudud</label>
            <select value={region} onChange={(e) => setRegion(e.target.value)} className="w-full bg-slate-100 rounded-xl px-3 py-2 text-xs font-semibold">
              <option value="all">Barchasi</option>
              {REGIONS.filter((r) => r !== 'Barchasi').map((r) => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
              <input type="checkbox" checked={verifiedOnly} onChange={(e) => setVerifiedOnly(e.target.checked)} /> Faqat tasdiqlangan
            </label>
            <label className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
              <input type="checkbox" checked={deliveryOnly} onChange={(e) => setDeliveryOnly(e.target.checked)} /> Yetkazib berish bor
            </label>
          </div>
        </div>
      )}

      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-0.5">
        <button onClick={() => setCategory('all')} className={`px-3.5 py-1.5 rounded-full text-[12px] font-bold shrink-0 border ${category === 'all' ? 'bg-[#111827] text-white border-[#111827]' : 'bg-white text-slate-700 border-slate-200'}`}>Barchasi</button>
        {categories.map((c) => (
          <button key={c.id} onClick={() => setCategory(c.id)} className={`px-3.5 py-1.5 rounded-full text-[12px] font-bold shrink-0 border ${category === c.id ? 'bg-[#111827] text-white border-[#111827]' : 'bg-white text-slate-700 border-slate-200'}`}>{c.name}</button>
        ))}
      </div>

      <p className="text-[12px] text-slate-500 font-medium px-1"><span className="font-extrabold text-[#111827]">{products.length}</span> ta mahsulot</p>

      {isLoading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
          {Array.from({ length: 6 }).map((_, i) => <div key={i} className="aspect-[3/4.2] rounded-[20px] bg-slate-100 animate-pulse" />)}
        </div>
      ) : products.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-[22px] border border-slate-200/80">
          <p className="text-xs font-bold text-slate-500">Hozircha mahsulotlar mavjud emas.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
          {products.map((p) => <B2BProductCard key={p.id} product={p} />)}
        </div>
      )}
    </div>
  );
};
