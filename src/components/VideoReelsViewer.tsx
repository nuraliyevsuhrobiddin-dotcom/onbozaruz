import React, { useEffect, useRef, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { lockBodyScroll, unlockBodyScroll } from '../utils/scrollLock';
import {
  ArrowLeft,
  Heart,
  MessageCircle,
  Send,
  Bookmark,
  Volume2,
  VolumeX,
  CheckCircle2,
  MapPin,
  PhoneCall,
  Tag,
  Play,
} from 'lucide-react';
import { Post } from '../data/mockAgroData';
import { useAgroStore } from '../store/useAgroStore';
import confetti from 'canvas-confetti';

// Official Telegram SVG icon
const TelegramSVG = () => (
  <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current" xmlns="http://www.w3.org/2000/svg">
    <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
  </svg>
);

interface SlideProps {
  post: Post;
  isActive: boolean;
  globalMuted: boolean;
  onUnmute: () => void;
}

const VideoSlide: React.FC<SlideProps> = ({ post, isActive, globalMuted, onUnmute }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [showHeart, setShowHeart] = useState(false);
  // Double-tap detection
  const lastTapTime = useRef(0);
  const singleTapTimer = useRef<number | null>(null);

  const {
    toggleLikePost,
    toggleSavePost,
    toggleFollowSeller,
    setCommentPost,
    setSharePost,
    likedPostIds,
    savedPostIds,
    followedSellerIds,
    currentUser,
    setSelectedSellerModal,
  } = useAgroStore();

  const isLiked = likedPostIds.includes(post.id);
  const isSaved = savedPostIds.includes(post.id);
  const isFollowing = followedSellerIds.includes(post.sellerId);
  const isOwnPost = currentUser?.id === post.sellerId;

  // Active slide: play; inactive: pause
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    if (isActive) {
      video.currentTime = 0;
      video.muted = globalMuted;
      video.volume = 1;

      const playPromise = video.play();
      if (playPromise !== undefined) {
        playPromise
          .then(() => setIsPlaying(true))
          .catch(() => {
            // Brauzer ovozli autoplayni rad etdi — ovozsizga o'tib qayta urinamiz
            video.muted = true;
            video.play().then(() => setIsPlaying(true)).catch(() => setIsPlaying(false));
          });
      }
    } else {
      video.pause();
      video.currentTime = 0;
      setIsPlaying(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isActive]);

  // globalMuted o'zgarganda faqat aktiv slide da ovozni sinxronlashtirish
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !isActive) return;
    video.muted = globalMuted;
  }, [globalMuted, isActive]);

  // Komponent unmount bo'lganda video ni to'xtatish
  useEffect(() => {
    const video = videoRef.current;
    return () => {
      video?.pause();
    };
  }, []);

  const handleDoubleTap = useCallback(() => {
    setShowHeart(true);
    if (!isLiked) toggleLikePost(post.id);
    confetti({ particleCount: 25, spread: 55, origin: { y: 0.5 }, colors: ['#E53935', '#FFFFFF'] });
    setTimeout(() => setShowHeart(false), 800);
  }, [isLiked, post.id, toggleLikePost]);

  const handleSingleTap = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) {
      video.play().then(() => setIsPlaying(true)).catch(() => {});
    } else {
      video.pause();
      setIsPlaying(false);
    }
  }, []);

  // Double-tap detection: 300ms window
  // Single tap fires only if no second tap arrives within 300ms
  const handleClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    const now = Date.now();
    const delta = now - lastTapTime.current;
    lastTapTime.current = now;

    if (delta < 300) {
      // Double tap detected — cancel pending single tap
      if (singleTapTimer.current !== null) {
        clearTimeout(singleTapTimer.current);
        singleTapTimer.current = null;
      }
      handleDoubleTap();
    } else {
      // Schedule single tap — cancelled if double tap comes
      singleTapTimer.current = window.setTimeout(() => {
        singleTapTimer.current = null;
        handleSingleTap();
      }, 300);
    }
  }, [handleDoubleTap, handleSingleTap]);

  const cleanPhone = post.phone.replace(/\s+/g, '').replace(/[()]/g, '');
  const cleanTelegram = post.telegram?.replace(/^@/, '').replace(/\s+/g, '');
  const telegramLink = cleanTelegram ? `https://t.me/${cleanTelegram}` : undefined;
  const telLink = `tel:${cleanPhone}`;

  return (
    <div
      className="relative w-full h-full flex items-center justify-center bg-black overflow-hidden select-none"
      style={{ height: '100dvh' }}
    >
      {/* Container: full on mobile, centered 9:16 card on desktop */}
      <div
        className="relative bg-black overflow-hidden flex items-center justify-center w-full h-full sm:h-[min(92dvh,760px)] sm:w-auto sm:aspect-[9/16] sm:rounded-[24px] shadow-2xl"
      >
        {/* Video / Image (tap to play/pause) */}
        {post.type === 'video' ? (
          <video
            ref={videoRef}
            src={post.mediaUrl}
            poster={post.posterUrl}
            loop
            muted={globalMuted}
            playsInline
            preload="auto"
            onClick={handleClick}
            onPlay={() => setIsPlaying(true)}
            onPause={() => setIsPlaying(false)}
            className="w-full h-full object-cover cursor-pointer"
          />
        ) : (
          <img
            src={post.mediaUrl || post.posterUrl}
            alt={post.title}
            onClick={handleClick}
            className="w-full h-full object-cover cursor-pointer"
          />
        )}

        {/* Bottom gradient overlay */}
        <div
          className="absolute inset-0 pointer-events-none z-10"
          style={{
            background:
              'linear-gradient(to top, rgba(0,0,0,0.88) 0%, rgba(0,0,0,0.45) 35%, rgba(0,0,0,0.08) 65%, transparent 100%)',
          }}
        />

        {/* Play/Pause center indicator — shows briefly */}
        {post.type === 'video' && isActive && !isPlaying && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20">
            <div className="w-16 h-16 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center">
              <Play className="w-8 h-8 text-white fill-white translate-x-0.5" />
            </div>
          </div>
        )}

        {/* Tap-to-unmute indicator (top center) */}
        {globalMuted && isActive && post.type === 'video' && (
          <button
            onClick={(e) => { e.stopPropagation(); onUnmute(); }}
            className="absolute top-4 left-1/2 -translate-x-1/2 z-30 flex items-center gap-2 px-3.5 py-2 rounded-full bg-black/70 backdrop-blur-md border border-white/20 shadow-lg text-white text-[12px] font-black hover:bg-black/90 transition-all"
            style={{ animation: 'pulse 2s ease-in-out infinite' }}
          >
            <VolumeX className="w-4 h-4 text-white/80" />
            <span>Ovozni yoqish</span>
            <Volume2 className="w-4 h-4 text-emerald-400" />
          </button>
        )}

        {/* Double-tap heart animation */}
        <AnimatePresence>
          {showHeart && (
            <motion.div
              key="heart"
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1.4, opacity: 1 }}
              exit={{ scale: 1.1, opacity: 0 }}
              transition={{ duration: 0.4, ease: 'easeOut' }}
              className="absolute inset-0 flex items-center justify-center pointer-events-none z-30"
            >
              <Heart className="w-28 h-28 fill-[#E53935] text-[#E53935] drop-shadow-2xl" />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Right action bar (Instagram style) */}
        <div
          className="absolute right-3 bottom-16 sm:right-4 sm:bottom-20 flex flex-col items-center gap-3.5 z-20"
        >
          {/* Like */}
          <motion.button
            whileTap={{ scale: 1.3 }}
            onClick={(e) => { e.stopPropagation(); toggleLikePost(post.id); }}
            className="flex flex-col items-center gap-1 focus:outline-none group"
          >
            <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-black/40 backdrop-blur-md border border-white/20 flex items-center justify-center transition-transform group-active:scale-90 shadow-lg">
              <Heart
                className={`w-6 h-6 drop-shadow-md ${
                  isLiked ? 'fill-[#E53935] text-[#E53935]' : 'text-white stroke-[2]'
                }`}
              />
            </div>
            <span className="text-white text-[11px] sm:text-[12px] font-black drop-shadow-md">
              {post.likesCount.toLocaleString()}
            </span>
          </motion.button>

          {/* Comment */}
          <motion.button
            whileTap={{ scale: 1.2 }}
            onClick={(e) => { e.stopPropagation(); setCommentPost(post); }}
            className="flex flex-col items-center gap-1 focus:outline-none group"
          >
            <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-black/40 backdrop-blur-md border border-white/20 flex items-center justify-center transition-transform group-active:scale-90 shadow-lg">
              <MessageCircle className="w-6 h-6 text-white stroke-[2] drop-shadow-md" />
            </div>
            <span className="text-white text-[11px] sm:text-[12px] font-black drop-shadow-md">
              {post.commentsCount}
            </span>
          </motion.button>

          {/* Share */}
          <motion.button
            whileTap={{ scale: 1.2 }}
            onClick={(e) => { e.stopPropagation(); setSharePost(post); }}
            className="flex flex-col items-center gap-1 focus:outline-none group"
          >
            <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-black/40 backdrop-blur-md border border-white/20 flex items-center justify-center transition-transform group-active:scale-90 shadow-lg">
              <Send className="w-6 h-6 text-white stroke-[2] drop-shadow-md" />
            </div>
            <span className="text-white text-[10px] sm:text-[11px] font-bold drop-shadow-md">Ulash</span>
          </motion.button>

          {/* Save */}
          <motion.button
            whileTap={{ scale: 1.2 }}
            onClick={(e) => { e.stopPropagation(); toggleSavePost(post.id); }}
            className="flex flex-col items-center gap-1 focus:outline-none group"
          >
            <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-black/40 backdrop-blur-md border border-white/20 flex items-center justify-center transition-transform group-active:scale-90 shadow-lg">
              <Bookmark
                className={`w-6 h-6 drop-shadow-md ${
                  isSaved ? 'fill-[#E53935] text-[#E53935]' : 'text-white stroke-[2]'
                }`}
              />
            </div>
          </motion.button>
        </div>

        {/* Bottom Overlay Information */}
        <div className="absolute left-3 right-16 bottom-4 sm:left-4 sm:right-20 sm:bottom-6 z-20 flex flex-col gap-2 pb-[calc(0.5rem+env(safe-area-inset-bottom))] max-w-[calc(100%-4.75rem)] sm:max-w-[420px]">
          {/* Row 1: Seller Avatar + Name + Obuna Button */}
          <div className="flex items-center gap-2.5">
            {/* Clickable avatar+name opens SellerProfileModal */}
            <button
              className="flex items-center gap-2.5 min-w-0 flex-1 text-left hover:opacity-80 transition-opacity active:scale-[0.97]"
              onClick={(e) => {
                e.stopPropagation();
                setSelectedSellerModal({
                  sellerId: post.sellerId,
                  sellerName: post.sellerName,
                  sellerAvatar: post.sellerAvatar,
                  location: post.location,
                  phone: post.phone,
                  telegram: post.telegram,
                  verified: post.verified,
                });
              }}
            >
              <div className="relative shrink-0">
                <img
                  src={post.sellerAvatar}
                  alt={post.sellerName}
                  className="w-10 h-10 rounded-full border-2 border-white/40 object-cover shadow-md"
                />
                {post.verified && (
                  <div className="absolute -bottom-0.5 -right-0.5 bg-blue-500 rounded-full p-0.5 text-white">
                    <CheckCircle2 className="w-3 h-3 fill-blue-500 text-white" />
                  </div>
                )}
              </div>

              <div className="min-w-0">
                <div className="flex items-center gap-1.5 truncate">
                  <span className="text-white font-black text-sm sm:text-base drop-shadow-md truncate">
                    {post.sellerName}
                  </span>
                </div>
                <div className="flex items-center gap-1 text-[11px] text-white/85 drop-shadow-sm truncate">
                  <MapPin className="w-3 h-3 shrink-0 text-red-400" />
                  <span className="truncate">{post.location}</span>
                </div>
              </div>
            </button>

            {!isOwnPost && (
              <motion.button
                whileTap={{ scale: 0.92 }}
                onClick={(e) => {
                  e.stopPropagation();
                  toggleFollowSeller(post.sellerId, post.sellerName);
                }}
                className={`shrink-0 text-[11px] font-extrabold px-3 py-1.5 rounded-full transition-all border backdrop-blur-md shadow-sm ${
                  isFollowing
                    ? 'bg-white/20 text-white border-white/30 hover:bg-white/30'
                    : 'bg-[#E53935] text-white border-transparent hover:bg-[#d32f2f]'
                }`}
              >
                {isFollowing ? '✓ Obuna' : '+ Obuna'}
              </motion.button>
            )}
          </div>

          {/* Row 2: Post Title */}
          {post.title && (
            <p className="text-white text-xs sm:text-sm font-semibold line-clamp-2 drop-shadow-md leading-snug">
              {post.title}
            </p>
          )}

          {/* Row 3: Price Tag & Category Badge */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-[#111827]/90 border border-emerald-500/40 px-3 py-1 text-[11px] sm:text-xs font-black text-[#22C55E] shadow-md backdrop-blur-md">
              {post.price}
            </span>
            <span className="rounded-full bg-black/40 backdrop-blur-md border border-white/20 px-2.5 py-1 text-[11px] font-bold text-white flex items-center gap-1">
              <Tag className="w-3 h-3 text-emerald-400" />
              {post.categoryName}
            </span>
          </div>

          {/* Row 4: Contact Action Buttons */}
          <div className="flex items-center gap-2 pt-1">
            <motion.a
              href={telLink}
              whileTap={{ scale: 0.95 }}
              onClick={(e) => e.stopPropagation()}
              className="flex-1 min-w-0 px-3.5 py-2 rounded-xl bg-[#E53935] hover:bg-[#d32f2f] text-white font-black text-[12px] flex items-center justify-center gap-2 shadow-lg transition-colors"
            >
              <PhoneCall className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">Bog'lanish</span>
            </motion.a>
            {telegramLink && (
              <motion.a
                href={telegramLink}
                target="_blank"
                rel="noopener noreferrer"
                whileTap={{ scale: 0.95 }}
                onClick={(e) => e.stopPropagation()}
                title="Telegram orqali bog'lanish"
                className="w-9 h-9 rounded-xl bg-[#0088cc] hover:bg-[#0077bb] text-white flex items-center justify-center shadow-lg shrink-0 transition-colors"
              >
                <TelegramSVG />
              </motion.a>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// -- Main Fullscreen Video Reels Viewer -----------------------------------------
export const VideoReelsViewer: React.FC = () => {
  const {
    isVideoViewerOpen,
    videoViewerPosts,
    videoViewerStartIndex,
    closeVideoViewer,
    posts,
  } = useAgroStore();

  // Feeddagi like/save o'zgarishlari viewer ichidagi post snapshotini ham darhol yangilaydi
  const liveVideoPosts = videoViewerPosts.map((viewerPost) =>
    posts.find((post) => post.id === viewerPost.id) || viewerPost
  );

  const [currentIndex, setCurrentIndex] = useState(0);
  // Ovozli boshlanadi — foydalanuvchi bosib kirdi (user gesture)
  const [globalMuted, setGlobalMuted] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const slideRefs = useRef<Map<number, HTMLDivElement>>(new Map());
  const isScrolling = useRef(false);
  const wheelTimeout = useRef<number | null>(null);
  const lastWheelTime = useRef(0);
  const scrollSettleTimer = useRef<number | null>(null);

  // Sync start index when viewer opens & position container cleanly
  useEffect(() => {
    if (!isVideoViewerOpen) return;
    setCurrentIndex(videoViewerStartIndex);
    setGlobalMuted(false);

    isScrolling.current = true;
    const timer = setTimeout(() => {
      const el = containerRef.current;
      if (el) {
        const targetChild = el.children[videoViewerStartIndex] as HTMLElement;
        if (targetChild && typeof targetChild.scrollIntoView === 'function') {
          targetChild.scrollIntoView({ block: 'start', behavior: 'instant' as ScrollBehavior });
        } else {
          const viewportHeight = el.clientHeight || window.innerHeight;
          el.scrollTop = videoViewerStartIndex * viewportHeight;
        }
      }
      setTimeout(() => {
        isScrolling.current = false;
      }, 100);
    }, 30);

    return () => clearTimeout(timer);
  }, [isVideoViewerOpen, videoViewerStartIndex]);

  // Lock body scroll while viewer is open
  useEffect(() => {
    if (isVideoViewerOpen) {
      lockBodyScroll();
    }
    return () => {
      unlockBodyScroll();
    };
  }, [isVideoViewerOpen]);

  // History API: push state when reels open so phone back button closes viewer, not the app
  useEffect(() => {
    if (!isVideoViewerOpen) return;

    history.pushState({ reels: true }, '');

    const handlePopState = () => {
      closeVideoViewer();
    };

    window.addEventListener('popstate', handlePopState);
    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, [isVideoViewerOpen, closeVideoViewer]);

  // IntersectionObserver to observe active slide (threshold 60% visibility)
  useEffect(() => {
    const container = containerRef.current;
    if (!container || !isVideoViewerOpen || liveVideoPosts.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (isScrolling.current) return;
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const idxStr = entry.target.getAttribute('data-index');
            if (idxStr !== null) {
              const idx = parseInt(idxStr, 10);
              if (!isNaN(idx) && idx !== currentIndex) {
                setCurrentIndex(idx);
              }
            }
          }
        });
      },
      {
        root: container,
        threshold: 0.6, // Firing only when 60% of slide enters viewport
      }
    );

    slideRefs.current.forEach((el) => {
      if (el) observer.observe(el);
    });

    return () => {
      observer.disconnect();
    };
  }, [isVideoViewerOpen, liveVideoPosts.length, currentIndex]);

  // Smoothly scroll to target index (for keyboard, wheel, dot navigation)
  const scrollToIndex = useCallback((idx: number) => {
    const el = containerRef.current;
    if (!el || liveVideoPosts.length === 0) return;
    const targetIdx = Math.max(0, Math.min(idx, liveVideoPosts.length - 1));

    isScrolling.current = true;
    const viewportHeight = el.clientHeight || window.innerHeight;
    el.scrollTo({ top: targetIdx * viewportHeight, behavior: 'smooth' });
    setCurrentIndex(targetIdx);

    if (wheelTimeout.current) window.clearTimeout(wheelTimeout.current);
    wheelTimeout.current = window.setTimeout(() => {
      isScrolling.current = false;
      wheelTimeout.current = null;
    }, 500);
  }, [liveVideoPosts.length]);

  // Native scroll settlement handler for touch & momentum scrolling
  const handleScroll = useCallback(() => {
    if (isScrolling.current || !containerRef.current) return;

    // Debounce scroll settlement to update index only when swipe settles
    if (scrollSettleTimer.current) {
      window.clearTimeout(scrollSettleTimer.current);
    }
    scrollSettleTimer.current = window.setTimeout(() => {
      if (!containerRef.current || isScrolling.current) return;
      const el = containerRef.current;
      const viewportHeight = el.clientHeight || window.innerHeight;
      if (viewportHeight <= 0) return;

      const settledIdx = Math.max(
        0,
        Math.min(Math.round(el.scrollTop / viewportHeight), liveVideoPosts.length - 1)
      );

      if (settledIdx !== currentIndex) {
        setCurrentIndex(settledIdx);
      }
    }, 80);
  }, [currentIndex, liveVideoPosts.length]);

  // Keyboard navigation
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') return closeVideoViewer();
      if (e.key === 'ArrowDown' || e.key === 'j') {
        e.preventDefault();
        scrollToIndex(currentIndex + 1);
      }
      if (e.key === 'ArrowUp' || e.key === 'k') {
        e.preventDefault();
        scrollToIndex(currentIndex - 1);
      }
    };
    if (isVideoViewerOpen) {
      window.addEventListener('keydown', onKey);
    }
    return () => window.removeEventListener('keydown', onKey);
  }, [closeVideoViewer, currentIndex, isVideoViewerOpen, scrollToIndex]);

  // Mouse wheel navigation (Desktop)
  const handleWheelNav = (e: React.WheelEvent) => {
    if (isScrolling.current) return;
    const now = Date.now();
    if (now - lastWheelTime.current < 400) return;
    lastWheelTime.current = now;
    if (e.deltaY > 40) {
      scrollToIndex(currentIndex + 1);
    } else if (e.deltaY < -40) {
      scrollToIndex(currentIndex - 1);
    }
  };

  if (!isVideoViewerOpen || liveVideoPosts.length === 0) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        className="fixed inset-0 z-[100] bg-black"
      >
        {/* Back button */}
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={closeVideoViewer}
          className="absolute top-4 left-4 z-30 px-3.5 py-2 rounded-full bg-black/60 backdrop-blur-md text-white font-black text-xs flex items-center gap-2 border border-white/20 shadow-lg hover:bg-black/80"
          style={{ top: 'calc(1rem + env(safe-area-inset-top))' }}
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Orqaga</span>
        </motion.button>

        {/* Top Right Controls: Audio */}
        <div
          className="absolute right-4 z-30 flex items-center gap-2"
          style={{ top: 'calc(1rem + env(safe-area-inset-top))' }}
        >
          {/* Mute toggle */}
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={() => setGlobalMuted(!globalMuted)}
            className="p-2 rounded-full bg-black/60 backdrop-blur-md text-white border border-white/20 shadow-lg hover:bg-black/80 flex items-center justify-center"
            title={globalMuted ? 'Ovozni yoqish' : "Ovozni o'chirish"}
          >
            {globalMuted ? (
              <VolumeX className="w-4 h-4 text-red-400" />
            ) : (
              <Volume2 className="w-4 h-4 text-white" />
            )}
          </motion.button>
        </div>

        {/* Scroll container */}
        <div
          ref={containerRef}
          onScroll={handleScroll}
          onWheel={handleWheelNav}
          className="w-full h-full overflow-y-auto no-scrollbar"
          style={{
            scrollSnapType: 'y mandatory',
            height: '100dvh',
            WebkitOverflowScrolling: 'touch',
            overscrollBehaviorY: 'contain',
            scrollbarWidth: 'none',
            msOverflowStyle: 'none',
          } as React.CSSProperties}
        >

          {liveVideoPosts.map((post, idx) => (
            <div
              key={post.id}
              data-index={idx}
              ref={(node) => {
                if (node) {
                  slideRefs.current.set(idx, node);
                } else {
                  slideRefs.current.delete(idx);
                }
              }}
              style={{
                scrollSnapAlign: 'start',
                scrollSnapStop: 'always' as any,
                height: '100dvh',
                flexShrink: 0,
              }}
            >
              <VideoSlide
                post={post}
                isActive={idx === currentIndex}
                globalMuted={globalMuted}
                onUnmute={() => setGlobalMuted(false)}
              />
            </div>
          ))}
        </div>

      </motion.div>
    </AnimatePresence>
  );
};
