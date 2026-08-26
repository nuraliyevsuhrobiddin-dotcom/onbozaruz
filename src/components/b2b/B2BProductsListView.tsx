import React, { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Search, X, SlidersHorizontal, ShoppingCart, Package, ChevronDown } from 'lucide-react';
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
  const hasActiveFilters = category !== 'all' || region !== 'all' || verifiedOnly || deliveryOnly;

  return (
    <div className="w-full max-w-170 mx-auto py-3 px-3 space-y-3 select-none pb-24">
      {/* Header */}
      <div className="flex items-center gap-2.5">
        <button
          onClick={() => setB2BRoute({ view: 'home' })}
          className="p-2 rounded-xl bg-white hover:bg-slate-50 text-slate-600 hover:text-slate-900 transition-colors border border-slate-200"
        >
          <ArrowLeft className="w-4.5 h-4.5" />
        </button>
        <div className="min-w-0 flex-1">
          <h1 className="font-black text-base text-slate-900 truncate">Ulgurji mahsulotlar</h1>
          <p className="text-[10px] text-slate-500 font-medium">
            <span className="text-blue-600 font-bold">{products.length}</span> ta mahsulot
          </p>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={() => { if (!isAuthenticated) { setAuthPromptOpen(true); } else { setB2BRoute({ view: 'orders' }); } }}
            title="Buyurtmalarim"
            className="p-2 rounded-xl bg-white hover:bg-slate-50 text-slate-600 hover:text-slate-900 transition-colors border border-slate-200"
          >
            <Package className="w-4 h-4" />
          </button>

          <button
            onClick={() => setB2BRoute({ view: 'cart' })}
            title="Savat"
            className="relative p-2 rounded-xl bg-blue-500 hover:bg-blue-600 text-white transition-colors shadow-lg shadow-blue-500/25 border border-blue-400/30"
          >
            <ShoppingCart className="w-4 h-4" />
            {cartCount > 0 && (
              <span className="absolute -top-1 -right-1 w-4.5 h-4.5 rounded-full bg-amber-400 text-slate-900 text-[9px] font-black flex items-center justify-center">
                {cartCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Search + Filter */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Mahsulot yoki brend qidirish..."
            className="w-full bg-white border border-slate-200 rounded-xl pl-10 pr-9 py-3 text-[13px] font-medium text-slate-800 placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition-all"
          />
          {searchTerm && (
            <button onClick={() => setSearchTerm('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
        <button
          onClick={() => setShowFilters((v) => !v)}
          className={`p-3 rounded-xl border shrink-0 transition-all ${
            showFilters || hasActiveFilters
              ? 'bg-blue-500 text-white border-blue-500 shadow-lg shadow-blue-500/25'
              : 'bg-white text-slate-500 border-slate-200 hover:border-blue-300 hover:text-slate-700'
          }`}
        >
          <SlidersHorizontal className="w-[18px] h-[18px]" />
        </button>
      </div>

      {/* Filter Panel */}
      {showFilters && (
        <div className="bg-white rounded-2xl border border-slate-200 p-4 space-y-4">
          <div>
            <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block mb-2">Hudud</label>
            <div className="relative">
              <select
                value={region}
                onChange={(e) => setRegion(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-semibold text-slate-800 outline-none appearance-none focus:ring-2 focus:ring-blue-500/30"
              >
                <option value="all">Barchasi</option>
                {REGIONS.filter((r) => r !== 'Barchasi').map((r) => <option key={r} value={r}>{r}</option>)}
              </select>
              <ChevronDown className="w-3.5 h-3.5 absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            </div>
          </div>
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 text-xs font-bold text-slate-700 cursor-pointer">
              <div
                onClick={() => setVerifiedOnly((v) => !v)}
                className={`w-4.5 h-4.5 rounded-md border flex items-center justify-center transition-all cursor-pointer ${verifiedOnly ? 'bg-blue-500 border-blue-500' : 'bg-white border-slate-300'}`}
              >
                {verifiedOnly && <span className="text-white text-[9px] font-black">✓</span>}
              </div>
              Faqat tasdiqlangan
            </label>
            <label className="flex items-center gap-2 text-xs font-bold text-slate-700 cursor-pointer">
              <div
                onClick={() => setDeliveryOnly((v) => !v)}
                className={`w-4.5 h-4.5 rounded-md border flex items-center justify-center transition-all cursor-pointer ${deliveryOnly ? 'bg-blue-500 border-blue-500' : 'bg-white border-slate-300'}`}
              >
                {deliveryOnly && <span className="text-white text-[9px] font-black">✓</span>}
              </div>
              Yetkazib berish bor
            </label>
          </div>
        </div>
      )}

      {/* Category chips */}
      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-0.5">
        <button
          onClick={() => setCategory('all')}
          className={`px-3.5 py-1.5 rounded-full text-[11px] font-bold shrink-0 border transition-all ${
            category === 'all'
              ? 'bg-blue-500 text-white border-blue-500 shadow-lg shadow-blue-500/25'
              : 'bg-white text-slate-600 border-slate-200 hover:border-blue-300 hover:text-slate-800'
          }`}
        >
          Barchasi
        </button>
        {categories.map((c) => (
          <button
            key={c.id}
            onClick={() => setCategory(c.id)}
            className={`px-3.5 py-1.5 rounded-full text-[11px] font-bold shrink-0 border transition-all ${
              category === c.id
                ? 'bg-blue-500 text-white border-blue-500 shadow-lg shadow-blue-500/25'
                : 'bg-white text-slate-600 border-slate-200 hover:border-blue-300 hover:text-slate-800'
            }`}
          >
            {c.name}
          </button>
        ))}
      </div>

      {/* Products grid */}
      {isLoading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="aspect-[3/4.2] rounded-2xl bg-white animate-pulse border border-slate-200" />
          ))}
        </div>
      ) : products.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-slate-200">
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
