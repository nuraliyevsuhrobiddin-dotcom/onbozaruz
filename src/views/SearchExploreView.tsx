import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, X, SlidersHorizontal, Heart, MessageCircle, Play, MapPin } from 'lucide-react';
import { useAgroStore } from '../store/useAgroStore';
import { CATEGORIES, REGIONS } from '../data/mockAgroData';

export const SearchExploreView: React.FC = () => {
  const { posts, openVideoViewer } = useAgroStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCat, setSelectedCat] = useState('all');
  const [selectedRegion, setSelectedRegion] = useState('all');
  const [showFilters, setShowFilters] = useState(false);

  const filteredPosts = posts.filter((p) => {
    const matchesCat = selectedCat === 'all' || p.category === selectedCat;
    const matchesRegion =
      selectedRegion === 'all' ||
      p.location.toLowerCase().includes(selectedRegion.toLowerCase());
    const matchesSearch =
      !searchTerm ||
      p.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.sellerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.categoryName.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesCat && matchesRegion && matchesSearch;
  });

  const handlePostClick = useCallback(
    (idx: number) => {
      openVideoViewer(filteredPosts, idx);
    },
    [filteredPosts, openVideoViewer]
  );

  const handleReset = () => {
    setSearchTerm('');
    setSelectedCat('all');
    setSelectedRegion('all');
    setShowFilters(false);
  };

  const activeFilterCount = [
    selectedCat !== 'all',
    selectedRegion !== 'all',
    searchTerm.length > 0,
  ].filter(Boolean).length;

  return (
    <div className="w-full max-w-[680px] mx-auto py-3 px-3 space-y-3.5">
      {/* Search Input Row */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Qidiruv: olmalar, bug'doy, traktor..."
            className="w-full bg-slate-100 border-0 rounded-[20px] pl-10 pr-10 py-3 text-[13px] text-slate-900 font-medium placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-[#E53935]/30 transition-all"
            autoFocus={false}
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Filter Toggle Button */}
        <motion.button
          whileTap={{ scale: 0.92 }}
          onClick={() => setShowFilters(!showFilters)}
          className={`relative p-3 rounded-[20px] border transition-all font-bold flex-shrink-0 ${
            showFilters || activeFilterCount > 0
              ? 'bg-[#111827] text-white border-[#111827]'
              : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
          }`}
        >
          <SlidersHorizontal className="w-4.5 h-4.5" />
          {activeFilterCount > 0 && (
            <span className="absolute -top-1.5 -right-1.5 w-4.5 h-4.5 text-[9px] font-black bg-[#E53935] text-white rounded-full flex items-center justify-center shadow">
              {activeFilterCount}
            </span>
          )}
        </motion.button>
      </div>

      {/* Filter Expanded Panel */}
      <AnimatePresence>
        {showFilters && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.25 }}
            className="bg-white rounded-[22px] border border-slate-200/80 p-4 space-y-3 shadow-md overflow-hidden"
          >
            {/* Hudud filter */}
            <div>
              <div className="flex items-center gap-1.5 mb-2">
                <MapPin className="w-3.5 h-3.5 text-[#E53935]" />
                <label className="text-[11px] font-extrabold text-slate-600 uppercase tracking-wider">
                  Hudud bo'yicha
                </label>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {REGIONS.map((reg) => (
                  <button
                    key={reg}
                    onClick={() => setSelectedRegion(reg === 'Barchasi' ? 'all' : reg)}
                    className={`px-3 py-1 rounded-[14px] text-[11px] font-bold transition-all ${
                      (reg === 'Barchasi' && selectedRegion === 'all') ||
                      selectedRegion === reg
                        ? 'bg-[#E53935] text-white shadow-sm'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    {reg}
                  </button>
                ))}
              </div>
            </div>

            {activeFilterCount > 0 && (
              <button
                onClick={handleReset}
                className="text-xs font-bold text-[#E53935] hover:underline"
              >
                Barcha filtrlarni tozalash
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Category Filter Pills */}
      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-0.5">
        {CATEGORIES.map((cat) => (
          <motion.button
            key={cat.id}
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setSelectedCat(cat.id)}
            className={`px-3.5 py-1.5 rounded-full text-[12px] font-bold transition-all shrink-0 flex items-center gap-1.5 border ${
              selectedCat === cat.id
                ? 'bg-[#111827] text-white border-[#111827] shadow-sm'
                : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
            }`}
          >
            <span>{cat.name}</span>
          </motion.button>
        ))}
      </div>

      {/* Results Count */}
      <div className="text-[12px] text-slate-500 font-medium px-1">
        <span className="font-extrabold text-[#111827]">{filteredPosts.length}</span> ta e'lon topildi
        {searchTerm && (
          <span> - "<span className="text-[#E53935] font-bold">{searchTerm}</span>" bo'yicha</span>
        )}
      </div>

      {/* Instagram Explore Masonry Grid */}
      {filteredPosts.length > 0 ? (
        <div className="grid grid-cols-3 gap-1.5">
          {filteredPosts.map((post, idx) => {
            // Instagram-style: every 3rd item is large (spans 2 rows)
            const isLarge = (idx % 6 === 0) || (idx % 6 === 5);
            return (
              <motion.div
                key={post.id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.25, delay: idx * 0.03 }}
                onClick={() => handlePostClick(idx)}
                className={`relative bg-slate-100 overflow-hidden cursor-pointer group rounded-[16px] shadow-sm ${
                  isLarge ? 'row-span-2' : ''
                }`}
                style={{ aspectRatio: isLarge ? '1/2' : '1/1' }}
              >
                <img
                  src={post.posterUrl || post.mediaUrl}
                  alt={post.title}
                  loading="lazy"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-400"
                />

                {/* Video badge */}
                {post.type === 'video' && (
                  <div className="absolute top-2 right-2 p-1.5 rounded-full bg-black/60 text-white backdrop-blur-sm shadow">
                    <Play className="w-3 h-3 fill-white" />
                  </div>
                )}

                {/* Bottom info strip */}
                <div className="absolute bottom-0 left-0 right-0 p-2.5 bg-gradient-to-t from-black/80 via-black/30 to-transparent">
                  <span className="font-extrabold text-[11px] text-[#22C55E] block leading-tight">
                    {post.price}
                  </span>
                  <span className="text-[10px] font-semibold text-slate-200 truncate block">
                    {post.sellerName}
                  </span>
                </div>

                {/* Hover overlay with Like + Comment counts */}
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center gap-4 text-white text-xs font-extrabold">
                  <span className="flex items-center gap-1">
                    <Heart className="w-4 h-4 fill-white" />
                    {post.likesCount.toLocaleString()}
                  </span>
                  <span className="flex items-center gap-1">
                    <MessageCircle className="w-4 h-4 fill-white" />
                    {post.commentsCount}
                  </span>
                </div>
              </motion.div>
            );
          })}
        </div>
      ) : (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="py-16 flex flex-col items-center gap-3 bg-white rounded-[22px] border border-slate-200/80 p-8 shadow-sm text-center select-none"
        >
          <img
            src="/logo.png"
            alt="OnBozor"
            className="w-16 h-16 rounded-[20px] object-cover shadow-sm ring-1 ring-slate-200/80 mb-1"
          />
          <h3 className="text-sm font-black text-[#111827]">
            Qidiruv bo'yicha e'lon topilmadi
          </h3>
          <p className="text-xs text-slate-400 max-w-xs leading-relaxed font-medium">
            "{searchTerm}" so'rovi bo'yicha hech nima topilmadi. Boshqa kalit so'z yoki filtrni sinab ko'ring.
          </p>
          <button
            onClick={handleReset}
            className="px-6 py-2.5 rounded-full bg-[#111827] text-white text-xs font-extrabold hover:bg-[#E53935] transition-colors mt-1 shadow-sm"
          >
            Filtrlarni tozalash
          </button>
        </motion.div>
      )}
    </div>
  );
};
