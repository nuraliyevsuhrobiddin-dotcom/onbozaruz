import React, { useState, useEffect } from 'react';
import { useAgroStore } from '../store/useAgroStore';
import { StoryBar, FarmerStory } from '../components/home/StoryBar';
import { FeedCard } from '../components/FeedCard';
import { LoadingSkeleton } from '../components/home/LoadingSkeleton';
import { EmptyState } from '../components/home/EmptyState';
import { WifiOff, RefreshCw, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export const HomeFeedView: React.FC = () => {
  const {
    posts,
    followedSellerIds,
    isHydrating,
    isOffline,
    isBackgroundFetching,
    fetchError,
    retryHydrate,
    uploadingPostStatus,
  } = useAgroStore();

  const [selectedSeller, setSelectedSeller] = useState<string | null>(null);

  // If store has 0 posts and is not currently fetching or in error, trigger hydration immediately
  useEffect(() => {
    if (posts.length === 0 && !isHydrating && !isBackgroundFetching && !fetchError) {
      retryHydrate();
    }
  }, [posts.length, isHydrating, isBackgroundFetching, fetchError, retryHydrate]);

  // Auth modal/profile flowdan qaytganda eski story filter feedni bo'sh qoldirmasin.
  useEffect(() => {
    const resetFeed = () => setSelectedSeller(null);
    window.addEventListener('onbozor:reset-feed', resetFeed);
    return () => window.removeEventListener('onbozor:reset-feed', resetFeed);
  }, []);

  // Verified farmers list for StoryBar
  const farmers: FarmerStory[] = Array.from(
    new Map(
      posts.map((p) => [
        p.sellerId,
        {
          id: p.sellerId,
          name: p.sellerName,
          avatar: p.sellerAvatar,
          verified: p.verified,
          online: true,
        },
      ])
    ).values()
  );

  const filteredPosts = posts.filter((p) => !selectedSeller || p.sellerId === selectedSeller);

  // Deduplicate posts by id to prevent accidental double renders
  const dedupedPosts = Array.from(new Map(filteredPosts.map((p) => [p.id, p])).values());

  const handleReset = () => {
    setSelectedSeller(null);
  };

  // ─── State classification ────────────────────────────────────────────────
  // 1. Loading: We have 0 posts in memory and hydration/fetch is in progress
  const isLoading = (isHydrating || isBackgroundFetching) && posts.length === 0 && !fetchError;
  // 2. Error: Fetch threw an error and we have 0 cached posts to show
  const isNetworkError = !!fetchError && posts.length === 0;
  // 3. Filtered empty: We have posts, but current filter (e.g. farmer) matched 0
  const isFilterEmpty = posts.length > 0 && dedupedPosts.length === 0;
  // 4. Truly empty: Backend is online, fetch finished, and database actually has 0 posts
  const isTrulyEmpty = !isHydrating && !isBackgroundFetching && !fetchError && posts.length === 0;

  return (
    <div className="w-full max-w-170 mx-auto px-0 sm:px-4 py-1.5 sm:py-2 space-y-2.5 sm:space-y-3.5">

      {/* ── Instagram-style Top Upload Status Banner ── */}
      <AnimatePresence>
        {uploadingPostStatus && (
          <motion.div
            key="upload-status-banner"
            initial={{ opacity: 0, y: -12, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -12, scale: 0.98 }}
            transition={{ duration: 0.3 }}
            className={`relative overflow-hidden rounded-2xl border p-3.5 shadow-md ${
              uploadingPostStatus.isUploading
                ? 'bg-[#111827] border-[#111827] text-white'
                : uploadingPostStatus.isSuccess
                ? 'bg-emerald-600 border-emerald-600 text-white'
                : 'bg-rose-600 border-rose-600 text-white'
            }`}
          >
            {/* Top progress line animation while uploading */}
            {uploadingPostStatus.isUploading && (
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#D84315] via-amber-400 to-emerald-400 animate-pulse" />
            )}

            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                {uploadingPostStatus.isUploading ? (
                  <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center shrink-0">
                    <Loader2 className="w-4 h-4 text-white animate-spin" />
                  </div>
                ) : uploadingPostStatus.isSuccess ? (
                  <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center shrink-0">
                    <CheckCircle2 className="w-5 h-5 text-white" />
                  </div>
                ) : (
                  <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center shrink-0">
                    <AlertCircle className="w-5 h-5 text-white" />
                  </div>
                )}

                <div className="min-w-0">
                  <p className="text-[12px] font-black leading-tight tracking-wide">
                    {uploadingPostStatus.isUploading
                      ? "E'lon joylanmoqda..."
                      : uploadingPostStatus.isSuccess
                      ? "E'lon muvaffaqiyatli joylandi! ✨"
                      : "E'lon joylashda xatolik yuz berdi"}
                  </p>
                  {uploadingPostStatus.title && (
                    <p className="text-[11px] opacity-80 truncate font-medium mt-0.5">
                      {uploadingPostStatus.title}
                    </p>
                  )}
                  {uploadingPostStatus.error && (
                    <p className="text-[11px] opacity-90 truncate font-medium mt-0.5 text-rose-100">
                      {uploadingPostStatus.error}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Offline / Network Error Banner (when we still have cached posts to show) */}
      <AnimatePresence>
        {(isOffline || fetchError === 'offline' || fetchError === 'network_error') && posts.length > 0 && (
          <motion.div
            key="offline-banner"
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.25 }}
            className="flex items-center justify-between gap-3 bg-amber-50 border border-amber-200 rounded-2xl px-4 py-3 shadow-sm"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <WifiOff className="w-4 h-4 text-amber-600 shrink-0" />
              <div className="min-w-0">
                <p className="text-[12px] font-bold text-amber-800 leading-tight">
                  {isOffline ? 'Offline rejim 📶' : 'Internet bilan aloqa yo\'q'}
                </p>
                <p className="text-[11px] text-amber-600 font-medium leading-tight mt-0.5 truncate">
                  Saqlangan e'lonlar ko'rsatilmoqda
                </p>
              </div>
            </div>
            <button
              onClick={retryHydrate}
              disabled={isBackgroundFetching}
              className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500 text-white text-[11px] font-extrabold hover:bg-amber-600 transition-colors disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
            >
              <RefreshCw className={`w-3 h-3 ${isBackgroundFetching ? 'animate-spin' : ''}`} />
              Qayta urinish
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Background fetch indicator (silent update) */}
      <AnimatePresence>
        {isBackgroundFetching && !isOffline && posts.length > 0 && (
          <motion.div
            key="bg-fetching"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex items-center gap-2 px-1"
          >
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[11px] text-slate-400 font-medium">Yangilanmoqda...</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 1. Obunalar (Sotuvchilar Yangi E'lonlari) StoryBar — only when sellers exist */}
      {farmers.length > 0 && (
        <StoryBar
          farmers={farmers}
          followedSellerIds={followedSellerIds}
          selectedSeller={selectedSeller}
          onSelectSeller={(sellerId) => setSelectedSeller(sellerId)}
          onOpenFarmerReels={(sellerId) => {
            const allVideoPosts = posts.filter((p) => p.type === 'video');
            if (allVideoPosts.length > 0) {
              const startIdx = allVideoPosts.findIndex((p) => p.sellerId === sellerId);
              useAgroStore.getState().openVideoViewer(allVideoPosts, startIdx !== -1 ? startIdx : 0);
            }
          }}
        />
      )}

      {/* 2. Main Content Area */}
      {isLoading ? (
        <LoadingSkeleton />
      ) : isNetworkError ? (
        <EmptyState
          isNetworkError={true}
          onReset={handleReset}
          onRetry={retryHydrate}
        />
      ) : dedupedPosts.length > 0 ? (
        <div>
          {dedupedPosts.map((post, index) => (
            <FeedCard
              key={post.id}
              post={post}
              allPosts={dedupedPosts}
              index={index}
            />
          ))}

          {/* End of Feed Indicator */}
          <div className="py-10 flex flex-col items-center gap-2 text-slate-400">
            <div className="w-10 h-1 bg-slate-200 rounded-full" />
            <p className="text-[12px] font-extrabold text-slate-400 mt-1">
              Barcha agro e'lonlar ko'rib chiqildi
            </p>
          </div>
        </div>
      ) : isFilterEmpty ? (
        <EmptyState
          isFilterEmpty={true}
          onReset={handleReset}
          onRetry={retryHydrate}
        />
      ) : isTrulyEmpty ? (
        <EmptyState
          isTrulyEmpty={true}
          onReset={handleReset}
          onRetry={retryHydrate}
        />
      ) : (
        <LoadingSkeleton />
      )}
    </div>
  );
};
