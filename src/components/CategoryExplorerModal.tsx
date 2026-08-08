import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Filter, CheckCircle2, PhoneCall, Tag, Apple, Wheat, Tractor, Beef, Sprout, Leaf, Package, Hexagon } from 'lucide-react';
import { useAgroStore } from '../store/useAgroStore';
import { CATEGORIES } from '../data/mockAgroData';


const categoryIconMap = {
  apple: Apple,
  wheat: Wheat,
  tractor: Tractor,
  beef: Beef,
  sprout: Sprout,
  leaf: Leaf,
  package: Package,
  honey: Hexagon,
};

const getCategoryIcon = (icon: string) =>
  categoryIconMap[icon as keyof typeof categoryIconMap] || Tag;

interface Props {
  categoryId: string | null;
  onClose: () => void;
}

export const CategoryExplorerModal: React.FC<Props> = ({ categoryId, onClose }) => {
  const { posts, setProductDetail } = useAgroStore();
  const [selectedSort, setSelectedSort] = useState<'newest' | 'price_low' | 'price_high'>('newest');

  if (!categoryId) return null;

  const categoryObj = CATEGORIES.find((c) => c.id === categoryId) || {
    id: categoryId,
    name: 'Agro Kategoriya',
    icon: 'wheat',
    image: '',
    count: '1.2K',
  };
  const CategoryIcon = getCategoryIcon(categoryObj.icon);

  let categoryPosts =
    categoryId === 'all'
      ? posts
      : posts.filter((p) => p.category === categoryId);

  const categoryCount = categoryPosts.length;

  // Sorting logic
  if (selectedSort === 'price_low') {
    categoryPosts = [...categoryPosts].sort((a, b) => a.numericPrice - b.numericPrice);
  } else if (selectedSort === 'price_high') {
    categoryPosts = [...categoryPosts].sort((a, b) => b.numericPrice - a.numericPrice);
  }

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/60 backdrop-blur-sm select-none">
        <motion.div
          initial={{ opacity: 0, scale: 0.94, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.94, y: 20 }}
          transition={{ duration: 0.25 }}
          className="w-full max-w-2xl bg-white rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]"
        >
          {/* Header */}
          <div className="px-5 py-4 bg-[#111111] text-white flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-[14px] bg-[#E53935] flex items-center justify-center text-xl shadow-md">
                <CategoryIcon className="h-5 w-5" />
              </div>
              <div>
                <h2 className="font-extrabold text-base sm:text-lg text-white leading-tight">
                  {categoryObj.name}
                </h2>
                <span className="text-[11px] text-slate-300">
                  {categoryCount} ta e'lon topildi • {categoryObj.count || categoryCount} jami mahsulot
                </span>
              </div>
            </div>

            <button
              onClick={onClose}
              className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Filter Bar */}
          <div className="px-4 py-3 bg-slate-50 border-b border-slate-200/80 flex items-center justify-between gap-2 overflow-x-auto">
            <div className="flex items-center gap-1 text-xs font-bold text-slate-700 shrink-0">
              <Filter className="w-3.5 h-3.5 text-[#E53935]" />
              <span>Saralash:</span>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              {[
                { id: 'newest', label: "Yangilari" },
                { id: 'price_low', label: "Arzonroq" },
                { id: 'price_high', label: "Qimmatroq" },
              ].map((s) => (
                <button
                  key={s.id}
                  onClick={() => setSelectedSort(s.id as 'newest' | 'price_low' | 'price_high')}
                  className={`px-3 py-1 rounded-full text-[11px] font-bold transition-all ${
                    selectedSort === s.id
                      ? 'bg-[#111111] text-white'
                      : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          {/* Category Items List */}
          <div className="p-4 overflow-y-auto space-y-3 flex-1">
            {categoryPosts.length === 0 ? (
              <div className="py-12 text-center text-slate-400 space-y-2">
                <img src="/logo.png" alt="OnBozor" className="w-12 h-12 rounded-[14px] mx-auto opacity-70" />
                <p className="text-sm font-bold text-[#111111]">Ushbu kategoriyada e'lon topilmadi</p>
              </div>
            ) : (
              categoryPosts.map((post) => (
                <div
                  key={post.id}
                  className="bg-white rounded-[18px] border border-slate-200/80 p-3 flex gap-3 hover:border-slate-300 transition-all shadow-sm"
                >
                  <img
                    src={post.posterUrl || post.mediaUrl}
                    alt={post.title}
                    onClick={() => setProductDetail(post)}
                    className="w-24 h-24 sm:w-28 sm:h-28 rounded-[14px] object-cover cursor-pointer shrink-0"
                  />

                  <div className="flex-1 min-w-0 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center gap-1 text-[11px] text-slate-400 mb-0.5">
                        <span className="font-bold text-slate-700 truncate">{post.sellerName}</span>
                        {post.verified && <CheckCircle2 className="w-3 h-3 text-blue-500 fill-blue-50" />}
                        <span>•</span>
                        <span className="truncate">{post.location}</span>
                      </div>

                      <h4
                        onClick={() => setProductDetail(post)}
                        className="font-bold text-xs sm:text-sm text-[#111111] line-clamp-2 cursor-pointer hover:underline"
                      >
                        {post.title}
                      </h4>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-slate-100 mt-2">
                      <div>
                        <span className="font-extrabold text-sm text-[#E53935] block">{post.price}</span>
                        <span className="text-[10px] text-slate-400">Min: {post.minOrder}</span>
                      </div>

                      <a
                        href={`tel:${post.phone.replace(/\s+/g, '').replace(/[()]/g, '')}`}
                        className="px-3 py-1.5 rounded-xl bg-[#E53935] text-white text-xs font-bold flex items-center gap-1 shadow-sm hover:bg-[#d32f2f]"
                      >
                        <PhoneCall className="w-3.5 h-3.5" />
                        <span>Bog'lanish</span>
                      </a>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
