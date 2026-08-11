import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search, X, SlidersHorizontal, Heart, MessageCircle, Play, MapPin, Video, Image as ImageIcon
} from 'lucide-react';
import { useAgroStore } from '../store/useAgroStore';
import { CATEGORIES, REGIONS } from '../data/mockAgroData';
import { Post } from '../api/types';

/* ─────────────────────────────────────────────
   Video thumbnail card — video elementdan
   birinchi kadrni oladi va hover bo'lganda ijro etadi
   ───────────────────────────────────────────── */
const VideoThumbnail: React.FC<{
  src: string;
  poster?: string;
  alt: string;
  isHovered?: boolean;
}> = ({ src, poster, alt, isHovered = false }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [capturedPoster, setCapturedPoster] = useState<string>(poster || '');
  const [hasError, setHasError] = useState(false);

  // Extract thumbnail frame on video metadata seeked
  useEffect(() => {
    if (capturedPoster) return;
    const video = document.createElement('video');
    video.src = src.includes('#t=') ? src : `${src}#t=0.5`;
    video.muted = true;
    video.playsInline = true;
    video.crossOrigin = 'anonymous';

    const capture = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = video.videoWidth || 360;
        canvas.height = video.videoHeight || 640;
        const ctx = canvas.getContext('2d');
        if (ctx && canvas.width > 0 && canvas.height > 0) {
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
          if (dataUrl && dataUrl.length > 500) {
            setCapturedPoster(dataUrl);
          }
        }
      } catch {
        // Ignore capture errors
      }
    };

    video.onloadedmetadata = () => {
      try {
        video.currentTime = 0.5;
      } catch {
        capture();
      }
    };
    video.onseeked = capture;
    video.onloadeddata = capture;
  }, [src, capturedPoster]);

  // Hover play / pause
  useEffect(() => {
    const video = videoRef.current;
    if (!video || hasError) return;

    if (isHovered) {
      const p = video.play();
      if (p !== undefined) p.catch(() => undefined);
    } else {
      video.pause();
    }
  }, [isHovered, hasError]);

  if (hasError) {
    return (
      <div className="w-full h-full bg-gradient-to-br from-slate-800 via-slate-900 to-slate-800 flex flex-col items-center justify-center p-3 text-center">
        <Video className="w-7 h-7 text-red-400 mb-1" />
        <span className="text-[10px] text-slate-300 font-medium truncate max-w-full">{alt}</span>
      </div>
    );
  }

  const effectivePoster = capturedPoster || poster;

  return (
    <div className="w-full h-full relative bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 overflow-hidden">
      {effectivePoster ? (
        <img
          src={effectivePoster}
          alt={alt}
          loading="lazy"
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          onError={() => setCapturedPoster('')}
        />
      ) : (
        <video
          ref={videoRef}
          src={src.includes('#t=') ? src : `${src}#t=0.5`}
          muted
          loop
          playsInline
          preload="auto"
          onError={() => setHasError(true)}
          className="w-full h-full object-cover pointer-events-none"
        />
      )}
    </div>
  );
};

/* ─────────────────────────────────────────────
   Grid card — rasm yoki video thumbnail
   ───────────────────────────────────────────── */
const ExploreCard: React.FC<{
  post: Post;
  idx: number;
  isLarge: boolean;
  onClick: () => void;
}> = ({ post, idx, isLarge, onClick }) => {
  const [isHovered, setIsHovered] = useState(false);
  const [imgError, setImgError] = useState(false);
  const isVideo =
    post.type === 'video' ||
    post.mediaUrl.endsWith('.mp4') ||
    post.mediaUrl.endsWith('.webm') ||
    post.mediaUrl.includes('data:video');

  const posterSrc = post.posterUrl && post.posterUrl.trim() !== '' ? post.posterUrl : undefined;

  return (
    <motion.div
      key={post.id}
      initial={{ opacity: 0, scale: 0.94 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.25, delay: Math.min(idx * 0.04, 0.3) }}
      onClick={onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={`relative bg-[#111827] overflow-hidden cursor-pointer group rounded-xl shadow-sm ${
        isLarge ? 'row-span-2' : ''
      }`}
      style={{ aspectRatio: isLarge ? '1/2' : '1/1' }}
    >
      {/* ── Media ── */}
      {isVideo ? (
        <VideoThumbnail
          src={post.mediaUrl}
          poster={posterSrc}
          alt={post.title}
          isHovered={isHovered}
        />
      ) : !imgError && post.mediaUrl ? (
        <img
          src={post.mediaUrl}
          alt={post.title}
          loading="lazy"
          onError={() => setImgError(true)}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
        />
      ) : (
        <div className="w-full h-full bg-gradient-to-br from-slate-800 to-slate-900 flex flex-col items-center justify-center p-2 text-center">
          <ImageIcon className="w-8 h-8 text-slate-500 mb-1" />
          <span className="text-[10px] text-slate-300 font-semibold truncate max-w-full">{post.title}</span>
        </div>
      )}

      {/* ── Gradyan overlay ── */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-transparent to-transparent pointer-events-none" />

      {/* ── Video badge ── */}
      {isVideo && (
        <div className="absolute top-2 right-2 p-1.5 rounded-full bg-black/60 text-white backdrop-blur-sm z-10 shadow">
          <Play className="w-3 h-3 fill-white" />
        </div>
      )}

      {/* ── Bottom info ── */}
      <div className="absolute bottom-0 left-0 right-0 px-2.5 pb-2 pt-4 pointer-events-none z-10">
        <span className="font-extrabold text-[11px] text-[#22C55E] block leading-tight drop-shadow">
          {post.price}
        </span>
        <span className="text-[10px] font-semibold text-white/90 truncate block leading-tight">
          {post.sellerName}
        </span>
      </div>

      {/* ── Hover overlay (like + comment) ── */}
      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center gap-5 text-white text-xs font-extrabold backdrop-blur-[1px] z-20">
        <span className="flex items-center gap-1.5">
          <Heart className="w-4 h-4 fill-white" />
          {(post.likesCount || 0).toLocaleString()}
        </span>
        <span className="flex items-center gap-1.5">
          <MessageCircle className="w-4 h-4 fill-white" />
          {post.commentsCount || 0}
        </span>
      </div>
    </motion.div>
  );
};

/* ─────────────────────────────────────────────
   Main view
   ───────────────────────────────────────────── */
export const SearchExploreView: React.FC = () => {
  const { posts, openVideoViewer, setProductDetail } = useAgroStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCat, setSelectedCat] = useState('all');
  const [selectedRegion, setSelectedRegion] = useState('all');
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  const filteredPosts = useMemo(() => {
    const term = searchTerm.toLowerCase().trim();
    const minP = minPrice ? Number(minPrice.replace(/\D/g, '')) : 0;
    const maxP = maxPrice ? Number(maxPrice.replace(/\D/g, '')) : Infinity;

    return posts.filter((p) => {
      const matchesCat = selectedCat === 'all' || p.category === selectedCat;
      const matchesRegion =
        selectedRegion === 'all' ||
        p.location.toLowerCase().includes(selectedRegion.toLowerCase());
      const matchesSearch =
        !term ||
        p.title.toLowerCase().includes(term) ||
        p.sellerName.toLowerCase().includes(term) ||
        p.categoryName.toLowerCase().includes(term);
      const matchesPrice = p.numericPrice >= minP && (maxP === Infinity || p.numericPrice <= maxP);
      return matchesCat && matchesRegion && matchesSearch && matchesPrice;
    });
  }, [posts, searchTerm, selectedCat, selectedRegion, minPrice, maxPrice]);

  const handlePostClick = useCallback(
    (idx: number) => {
      const clickedPost = filteredPosts[idx];
      if (!clickedPost) return;

      const isVideo =
        clickedPost.type === 'video' ||
        clickedPost.mediaUrl.endsWith('.mp4') ||
        clickedPost.mediaUrl.endsWith('.webm') ||
        clickedPost.mediaUrl.includes('data:video');

      if (isVideo) {
        // Video postlarni alohida ajratib, bosilgan video indeksini id bo'yicha aniq topamiz
        const videoPosts = filteredPosts.filter(
          (p) =>
            p.type === 'video' ||
            p.mediaUrl.endsWith('.mp4') ||
            p.mediaUrl.endsWith('.webm') ||
            p.mediaUrl.includes('data:video')
        );
        const videoIdx = videoPosts.findIndex((v) => v.id === clickedPost.id);
        openVideoViewer(videoPosts, videoIdx !== -1 ? videoIdx : 0);
      } else {
        // Rasm shaklidagi e'lon bo'lsa detail modalni ochamiz
        setProductDetail(clickedPost);
      }
    },
    [filteredPosts, openVideoViewer, setProductDetail]
  );

  const handleReset = () => {
    setSearchTerm('');
    setSelectedCat('all');
    setSelectedRegion('all');
    setMinPrice('');
    setMaxPrice('');
    setShowFilters(false);
  };

  const activeFilterCount = [
    selectedCat !== 'all',
    selectedRegion !== 'all',
    minPrice !== '',
    maxPrice !== '',
    searchTerm.length > 0,
  ].filter(Boolean).length;

  return (
    <div className="w-full max-w-170 mx-auto py-3 px-3 space-y-3">

      {/* ── Search Input Row ── */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Qidiruv: olmalar, bug'doy, traktor..."
            className="w-full bg-slate-100 border-0 rounded-2xl pl-10 pr-10 py-3 text-[13px] text-slate-900 font-medium placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-[#E53935]/30 transition-all"
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

        {/* Filter Toggle */}
        <motion.button
          whileTap={{ scale: 0.92 }}
          onClick={() => setShowFilters(!showFilters)}
          className={`relative p-3 rounded-2xl border transition-all font-bold shrink-0 ${
            showFilters || activeFilterCount > 0
              ? 'bg-[#111827] text-white border-[#111827]'
              : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
          }`}
        >
          <SlidersHorizontal className="w-[18px] h-[18px]" />
          {activeFilterCount > 0 && (
            <span className="absolute -top-1.5 -right-1.5 w-4.5 h-4.5 text-[9px] font-black bg-[#E53935] text-white rounded-full flex items-center justify-center shadow">
              {activeFilterCount}
            </span>
          )}
        </motion.button>
      </div>

      {/* ── Filter Panel ── */}
      <AnimatePresence>
        {showFilters && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.25 }}
            className="bg-white rounded-[22px] border border-slate-200/80 p-4 space-y-3 shadow-md overflow-hidden"
          >
            {/* Hudud */}
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
                      (reg === 'Barchasi' && selectedRegion === 'all') || selectedRegion === reg
                        ? 'bg-[#E53935] text-white shadow-sm'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    {reg}
                  </button>
                ))}
              </div>
            </div>

            {/* Narx */}
            <div>
              <label className="text-[11px] font-extrabold text-slate-600 uppercase tracking-wider block mb-1.5">
                Narx oralig'i (so'm)
              </label>
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="text"
                  inputMode="numeric"
                  placeholder="Min narx"
                  value={minPrice}
                  onChange={(e) => setMinPrice(e.target.value.replace(/\D/g, ''))}
                  className="bg-slate-100 rounded-xl px-3 py-2 text-xs font-semibold text-slate-900 outline-none focus:ring-2 focus:ring-[#E53935]/30"
                />
                <input
                  type="text"
                  inputMode="numeric"
                  placeholder="Max narx"
                  value={maxPrice}
                  onChange={(e) => setMaxPrice(e.target.value.replace(/\D/g, ''))}
                  className="bg-slate-100 rounded-xl px-3 py-2 text-xs font-semibold text-slate-900 outline-none focus:ring-2 focus:ring-[#E53935]/30"
                />
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

      {/* ── Category Pills ── */}
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

      {/* ── Results count ── */}
      <div className="text-[12px] text-slate-500 font-medium px-1">
        <span className="font-extrabold text-[#111827]">{filteredPosts.length}</span> ta e'lon topildi
        {searchTerm && (
          <span>
            {' '}— "<span className="text-[#E53935] font-bold">{searchTerm}</span>" bo'yicha
          </span>
        )}
      </div>

      {/* ── Instagram Explore Grid ── */}
      {filteredPosts.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-[3px]">
          {filteredPosts.map((post, idx) => {
            // Instagram-style: har 6 elementda 1-chi va 6-chi katta
            const isLarge = idx % 6 === 0 || idx % 6 === 5;
            return (
              <ExploreCard
                key={post.id}
                post={post}
                idx={idx}
                isLarge={isLarge}
                onClick={() => handlePostClick(idx)}
              />
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
            {searchTerm
              ? `"${searchTerm}" so'rovi bo'yicha hech nima topilmadi.`
              : "Boshqa kalit so'z yoki filtrni sinab ko'ring."}
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
