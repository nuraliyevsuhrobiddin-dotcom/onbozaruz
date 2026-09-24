import React, { useEffect, useLayoutEffect, useRef, useState, useCallback, memo } from 'react';
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
  AlertTriangle,
  RefreshCw,
  Loader2,
} from 'lucide-react';
import { Post } from '../data/mockAgroData';
import { useAgroStore } from '../store/useAgroStore';
import confetti from 'canvas-confetti';
import { useVideoFrame } from '../hooks/useVideoFrame';
import { useVideoPlayback } from '../hooks/useVideoPlayback';
import { useNetworkStatus } from '../hooks/useNetworkStatus';
import { useOverlayNavigation } from '../hooks/useOverlayNavigation';

// Official Telegram SVG icon
const TelegramSVG = () => (
  <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current" xmlns="http://www.w3.org/2000/svg">
    <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
  </svg>
);

// ---------------------------------------------------------------------------
// Preload strategy helper
// ---------------------------------------------------------------------------
type PreloadMode = 'active' | 'next' | 'previous' | 'none';

function getPreloadMode(idx: number, currentIndex: number, isSlowConnection: boolean): PreloadMode {
  if (idx === currentIndex) return 'active';
  // Keep the previous decoder/frame for a quick reverse swipe. Only one
  // upcoming video buffers ahead, and data-saver connections skip that fetch.
  if (idx === currentIndex - 1) return 'previous';
  if (!isSlowConnection && idx === currentIndex + 1) return 'next';
  return 'none';
}

// ---------------------------------------------------------------------------
// VideoSlide
// ---------------------------------------------------------------------------
interface SlideProps {
  post: Post;
  isActive: boolean;
  preloadMode: PreloadMode;
  globalMuted: boolean;
  onAutoplayMuted: () => void;
}

// memo prevents re-renders when the parent's state changes but this slide's
// props haven't changed (e.g. globalMuted toggle causes full list re-render).
const VideoSlide: React.FC<SlideProps> = memo(({ post, isActive, preloadMode, globalMuted, onAutoplayMuted }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isBuffering, setIsBuffering] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [retryKey, setRetryKey] = useState(0);
  const [showHeart, setShowHeart] = useState(false);
  const [posterFailed, setPosterFailed] = useState(false);
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
    showToast,
    setAuthPromptOpen,
  } = useAgroStore();

  const isLiked = likedPostIds.includes(post.id);
  const isSaved = savedPostIds.includes(post.id);
  const isFollowing = followedSellerIds.includes(post.sellerId);
  const isOwnPost = currentUser?.id === post.sellerId;

  // At most three media sources are attached; distant slides are unmounted.
  const videoSrc = preloadMode !== 'none' ? post.mediaUrl : undefined;
  const posterSrc = post.posterUrl || undefined;
  const hasFrame = useVideoFrame(videoRef, videoSrc, retryKey);
  useVideoPlayback(videoRef, videoSrc, isActive, globalMuted, retryKey, onAutoplayMuted);

  // Reset playback feedback when the resource changes.
  useEffect(() => {
    setHasError(false);
    setIsBuffering(false);
    setIsPlaying(false);
    setPosterFailed(false);
  }, [retryKey, videoSrc]);

  // A delayed single tap must not play the slide after the user swipes away.
  useEffect(() => () => {
    if (singleTapTimer.current !== null) window.clearTimeout(singleTapTimer.current);
    singleTapTimer.current = null;
    lastTapTime.current = 0;
  }, [isActive]);

  const handleRetry = useCallback(() => {
    setRetryKey((k) => k + 1);
  }, []);

  const handleDoubleTap = useCallback(() => {
    setShowHeart(true);
    if (!isLiked) toggleLikePost(post.id);
    confetti({ particleCount: 25, spread: 55, origin: { y: 0.5 }, colors: ['#D84315', '#FFFFFF'] });
    setTimeout(() => setShowHeart(false), 800);
  }, [isLiked, post.id, toggleLikePost]);

  const handleSingleTap = useCallback(() => {
    const video = videoRef.current;
    if (!video || hasError || !isActive) return;
    if (video.paused) {
      video.play().then(() => setIsPlaying(true)).catch(() => {});
    } else {
      video.pause();
      setIsPlaying(false);
    }
  }, [hasError, isActive]);

  // Double-tap detection: 300ms window
  const handleClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    const now = Date.now();
    const delta = now - lastTapTime.current;
    lastTapTime.current = now;

    if (delta < 300) {
      if (singleTapTimer.current !== null) {
        clearTimeout(singleTapTimer.current);
        singleTapTimer.current = null;
      }
      handleDoubleTap();
    } else {
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


  const preloadAttr = preloadMode === 'active' || preloadMode === 'next'
    ? 'auto'
    : preloadMode === 'previous' ? 'metadata' : 'none';

  return (
    <div
      className="relative w-full h-full flex items-center justify-center bg-black overflow-hidden select-none"
      style={{
        height: '100dvh',
        // GPU compositing layer — iOS Safari'da jelly scroll yo'q
        transform: 'translateZ(0)',
        willChange: 'transform',
      }}
    >
      {/* Edge-to-edge on mobile, full-height portrait surface on desktop. */}
      <div
        className="reels-card relative bg-black overflow-hidden flex flex-col"
        style={{ transform: 'translateZ(0)' }}
      >
        {/* The video gets all available space above the compact contact footer. */}
        <div className="reels-media relative min-h-0 w-full flex-1 overflow-hidden">
        {/* Video / Image */}
        {post.type === 'video' ? (
          <>
            <video
              key={retryKey}
              ref={videoRef}
              src={videoSrc}
              poster={posterSrc}
              loop
              muted={!isActive || globalMuted}
              playsInline
              webkit-playsinline="true"
              x5-playsinline="true"
              x5-video-player-type="h5-page"
              preload={preloadAttr}
              onClick={handleClick}
              onPlay={() => { setIsPlaying(true); setIsBuffering(false); }}
              onPause={() => setIsPlaying(false)}
              onWaiting={() => { if (isActive) setIsBuffering(true); }}
              onStalled={() => { if (isActive) setIsBuffering(true); }}
              onCanPlay={() => { setIsBuffering(false); }}
              onPlaying={() => {
                setIsPlaying(true);
                setIsBuffering(false);
              }}
              onError={(e) => { if (videoSrc && e.currentTarget.error) setHasError(true); setIsBuffering(false); }}
              className="reels-visual relative z-[1] cursor-pointer"
            />

            {/* Poster / Placeholder Overlay — smoothly covers video until first frame arrives */}
            {!hasFrame && !hasError && (
              <div data-video-placeholder className="absolute inset-0 z-[2] pointer-events-none flex items-center justify-center bg-black/35 backdrop-blur-[1px] transition-opacity duration-300">
                {posterSrc && !posterFailed ? (
                  <img
                    src={posterSrc}
                    alt={post.title}
                    onError={() => setPosterFailed(true)}
                    className="reels-visual absolute inset-0"
                  />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center gap-3 p-6 text-center bg-[radial-gradient(circle_at_center,_rgba(51,65,85,0.88),_rgba(2,6,23,0.96)_58%,_rgba(0,0,0,1)_100%)]">
                    <div className="w-14 h-14 rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center shadow-lg border border-white/10">
                      <Play className="w-7 h-7 text-white/80 fill-white/80 translate-x-0.5" />
                    </div>
                    <span className="text-sm font-bold text-white/90 max-w-[240px] truncate">{post.title}</span>
                    <div className="flex items-center gap-2 mt-1 px-3 py-1 rounded-full bg-white/10 border border-white/10 text-white/70 text-xs">
                      <Loader2 className="w-4 h-4 text-[#D84315] animate-spin" />
                      <span>Yuklanmoqda...</span>
                    </div>
                  </div>
                )}
              </div>
            )}
          </>
        ) : (
          <img
            src={post.mediaUrl || post.posterUrl}
            alt={post.title}
            onClick={handleClick}
            className="reels-visual relative z-[1] cursor-pointer"
          />
        )}

        {/* A local caption scrim keeps text readable without darkening the frame. */}
        <div
          className="absolute inset-x-0 bottom-0 h-[45%] pointer-events-none z-10"
          style={{
            background:
              'linear-gradient(to top, rgba(0,0,0,0.7), transparent)',
          }}
        />

        {/* Buffering spinner — only for a mid-playback stall on the active
            slide. Before the first frame arrives, the poster/placeholder
            overlay above already shows its own spinner — this avoids
            stacking two of them. */}
        {post.type === 'video' && isActive && isBuffering && hasFrame && !hasError && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20">
            <div className="w-14 h-14 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center">
              <Loader2 className="w-7 h-7 text-white animate-spin" />
            </div>
          </div>
        )}

        {/* Play/Pause center indicator — shows when paused and not buffering */}
        {post.type === 'video' && isActive && hasFrame && !isPlaying && !isBuffering && !hasError && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20">
            <div className="w-16 h-16 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center">
              <Play className="w-8 h-8 text-white fill-white translate-x-0.5" />
            </div>
          </div>
        )}

        {/* Error state with retry */}
        {post.type === 'video' && hasError && (
          <div className="absolute inset-0 flex items-center justify-center z-20 bg-black/60 backdrop-blur-sm">
            <div className="flex flex-col items-center gap-3 px-6 text-center">
              <AlertTriangle className="w-10 h-10 text-amber-400" />
              <p className="text-white text-sm font-bold">Video yuklanmadi</p>
              <p className="text-white/70 text-xs">Internet aloqangizni tekshirib, qayta urinib ko'ring</p>
              <motion.button
                whileTap={{ scale: 0.93 }}
                onClick={(e) => { e.stopPropagation(); handleRetry(); }}
                className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/20 hover:bg-white/30 border border-white/30 text-white text-sm font-bold backdrop-blur-md transition-colors"
              >
                <RefreshCw className="w-4 h-4" />
                Qayta yuklash
              </motion.button>
            </div>
          </div>
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
              <Heart className="w-28 h-28 fill-[#D84315] text-[#D84315] drop-shadow-2xl" />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Right action bar (Instagram style) */}
        <div
          className="reels-actions absolute right-3 bottom-4 sm:right-4 flex flex-col items-center gap-3.5 z-20"
        >
          {/* Like */}
          <motion.button
            whileTap={{ scale: 1.3 }}
            onClick={(e) => { e.stopPropagation(); toggleLikePost(post.id); }}
            aria-label="Yoqtirish"
            aria-pressed={isLiked}
            className="flex flex-col items-center gap-1 focus:outline-none group"
          >
            <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-black/40 backdrop-blur-md border border-white/20 flex items-center justify-center transition-transform group-active:scale-90 shadow-lg">
              <Heart
                className={`w-6 h-6 drop-shadow-md ${
                  isLiked ? 'fill-[#D84315] text-[#D84315]' : 'text-white stroke-[2]'
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
            aria-label="Izohlar"
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
            aria-label="Ulashish"
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
            aria-label="Saqlash"
            aria-pressed={isSaved}
            className="flex flex-col items-center gap-1 focus:outline-none group"
          >
            <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-black/40 backdrop-blur-md border border-white/20 flex items-center justify-center transition-transform group-active:scale-90 shadow-lg">
              <Bookmark
                className={`w-6 h-6 drop-shadow-md ${
                  isSaved ? 'fill-[#D84315] text-[#D84315]' : 'text-white stroke-[2]'
                }`}
              />
            </div>
          </motion.button>
        </div>

        {/* Compact Instagram-style caption; the action rail has its own right gutter. */}
        <div className="absolute bottom-3 left-3 right-20 z-20 flex flex-col gap-2 sm:left-4">
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
                  src={post.sellerAvatar || '/logo.png'}
                  onError={(event) => {
                    event.currentTarget.onerror = null;
                    event.currentTarget.src = '/logo.png';
                  }}
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
                    : 'bg-[#D84315] text-white border-transparent hover:bg-[#d32f2f]'
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
            <span className="max-w-full truncate rounded-full bg-[#111827]/90 border border-emerald-500/40 px-3 py-1 text-[11px] sm:text-xs font-black text-[#22C55E] shadow-md backdrop-blur-md">
              {post.price}
            </span>
            <span className="min-w-0 max-w-full rounded-full bg-black/40 backdrop-blur-md border border-white/20 px-2.5 py-1 text-[11px] font-bold text-white flex items-center gap-1">
              <Tag className="w-3 h-3 shrink-0 text-emerald-400" />
              <span className="truncate">{post.categoryName}</span>
            </span>
          </div>
        </div>
        </div>

          {/* Only contact actions sit below the video, with no unused panel space. */}
          <div className="reels-contact relative z-20 flex shrink-0 items-center gap-2 bg-black px-3 pt-2 pb-[calc(0.5rem+env(safe-area-inset-bottom))] sm:px-4">
            <motion.a
              href={currentUser ? telLink : undefined}
              whileTap={{ scale: 0.95 }}
              onClick={(e) => {
                e.stopPropagation();
                if (!currentUser) {
                  e.preventDefault();
                  showToast("Bog'lanish uchun avval tizimga kiring");
                  setAuthPromptOpen(true);
                }
              }}
              className="flex-1 min-w-0 min-h-11 px-3.5 py-2 rounded-xl bg-[#D84315] hover:bg-[#d32f2f] text-white font-black text-[12px] flex items-center justify-center gap-2 shadow-lg transition-colors cursor-pointer"
            >
              <PhoneCall className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">Bog'lanish</span>
            </motion.a>
            {telegramLink && (
              <motion.a
                href={currentUser ? telegramLink : undefined}
                target={currentUser ? "_blank" : undefined}
                rel="noopener noreferrer"
                whileTap={{ scale: 0.95 }}
                onClick={(e) => {
                  e.stopPropagation();
                  if (!currentUser) {
                    e.preventDefault();
                    showToast("Bog'lanish uchun avval tizimga kiring");
                    setAuthPromptOpen(true);
                  }
                }}
                title="Telegram orqali bog'lanish"
                className="w-11 h-11 rounded-xl bg-[#0088cc] hover:bg-[#0077bb] text-white flex items-center justify-center shadow-lg shrink-0 transition-colors cursor-pointer"
              >
                <TelegramSVG />
              </motion.a>
            )}
          </div>
      </div>
    </div>
  );
});

VideoSlide.displayName = 'VideoSlide';

// -- Main Fullscreen Video Reels Viewer -----------------------------------------
export const VideoReelsViewer: React.FC = () => {
  const {
    isVideoViewerOpen,
    videoViewerPosts,
    videoViewerStartIndex,
    closeVideoViewer,
    posts,
  } = useAgroStore();
  const dismissViewer = useOverlayNavigation(isVideoViewerOpen, closeVideoViewer);

  // Feeddagi like/save o'zgarishlari viewer ichidagi post snapshotini ham darhol yangilaydi
  // useMemo: faqat posts yoki videoViewerPosts o'zgarganda qayta hisoblanadi
  const liveVideoPosts = React.useMemo(
    () => videoViewerPosts.map((viewerPost) =>
      posts.find((post) => post.id === viewerPost.id) || viewerPost
    ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [videoViewerPosts, posts]
  );

  const [currentIndex, setCurrentIndex] = useState(0);
  // Let device media volume control sound. Fall back to mute only when the
  // browser rejects audible playback, with the audio button kept in sync.
  const [globalMuted, setGlobalMuted] = useState(false);
  const handleAutoplayMuted = useCallback(() => setGlobalMuted(true), []);
  // Floating control visibility: appears on scroll, hides after inactivity
  const [showFloatingControls, setShowFloatingControls] = useState(true);
  const floatingControlsTimer = useRef<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const scrollFrame = useRef<number | null>(null);
  const scrollSettleTimer = useRef<number | null>(null);
  const wasOpenRef = useRef(false);
  // Scroll and keyboard callbacks share the latest visible index.
  const currentIndexRef = useRef(currentIndex);
  const { isSlowConnection } = useNetworkStatus();
  const requestedStartIndex = Math.max(0, Math.min(videoViewerStartIndex, Math.max(0, liveVideoPosts.length - 1)));
  // This component stays mounted while closed. On the opening render, use the
  // requested item rather than the stale index from the previous session so
  // phones never start fetching videos 0 and 1 before the selected reel.
  const renderedIndex = isVideoViewerOpen && !wasOpenRef.current
    ? requestedStartIndex
    : currentIndex;

  useEffect(() => {
    currentIndexRef.current = currentIndex;
  }, [currentIndex]);

  // Sync the requested item and scroll position before the overlay paints.
  // `useEffect` here produces a short flash at item 0 and starts needless
  // network requests for its video on slower phones.
  useLayoutEffect(() => {
    if (!isVideoViewerOpen) {
      wasOpenRef.current = false;
      return;
    }

    wasOpenRef.current = true;
    setCurrentIndex(requestedStartIndex);
    currentIndexRef.current = requestedStartIndex;
    setGlobalMuted(false);
    setShowFloatingControls(true);

    const el = containerRef.current;
    const targetChild = el?.children[requestedStartIndex] as HTMLElement | undefined;
    if (el) {
      el.scrollTop = targetChild?.offsetTop ?? requestedStartIndex * (el.clientHeight || window.innerHeight);
    }

  }, [isVideoViewerOpen, requestedStartIndex]);

  // Floating controls auto-hide timer
  useEffect(() => {
    if (!showFloatingControls) return;

    if (floatingControlsTimer.current) {
      window.clearTimeout(floatingControlsTimer.current);
    }

    floatingControlsTimer.current = window.setTimeout(() => {
      setShowFloatingControls(false);
    }, 3000);

    return () => {
      if (floatingControlsTimer.current) {
        window.clearTimeout(floatingControlsTimer.current);
      }
    };
  }, [showFloatingControls]);

  // Show controls on any user interaction
  const revealControls = useCallback(() => {
    setShowFloatingControls(true);
  }, []);

  const changeMuted = useCallback((muted: boolean) => {
    const video = containerRef.current
      ?.querySelector<HTMLVideoElement>(`[data-index="${currentIndexRef.current}"] video`);
    // Run inside the gesture: deferring unmute/play to an effect can lose
    // Safari's user activation and leave a paused, silent video.
    if (video) {
      video.muted = muted;
      video.volume = muted ? 0 : 1;
      if (!muted) {
        void video.play().catch((error: DOMException) => {
          if (error.name === 'NotAllowedError' && video.isConnected && !video.muted) {
            video.muted = true;
            setGlobalMuted(true);
          }
        });
      }
    }
    setGlobalMuted(muted);
    revealControls();
  }, [revealControls]);

  // Lock body scroll while viewer is open
  useEffect(() => {
    if (!isVideoViewerOpen) return;
    lockBodyScroll();
    return () => {
      unlockBodyScroll();
    };
  }, [isVideoViewerOpen]);

  // Use the actual scroll position, including during momentum and smooth
  // navigation. Observer batches can contain only the outgoing slide, which
  // used to select the wrong item and leave the visible video without a src.
  const syncVisibleIndex = useCallback(() => {
    const el = containerRef.current;
    if (!el || !el.clientHeight || !liveVideoPosts.length) return;
    const idx = Math.max(0, Math.min(
      Math.round(el.scrollTop / el.clientHeight), liveVideoPosts.length - 1,
    ));
    if (idx !== currentIndexRef.current) {
      currentIndexRef.current = idx;
      setCurrentIndex(idx);
    }
  }, [liveVideoPosts.length]);

  const handleScroll = useCallback(() => {
    revealControls();
    // Debounce: only update the active index once scrolling settles.
    // Firing on every rAF during a swipe causes rapid play/pause cycling
    // and black frames on mobile hardware decoders.
    if (scrollSettleTimer.current !== null) {
      window.clearTimeout(scrollSettleTimer.current);
    }
    scrollSettleTimer.current = window.setTimeout(() => {
      scrollSettleTimer.current = null;
      syncVisibleIndex();
    }, 150);
  }, [revealControls, syncVisibleIndex]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el || !isVideoViewerOpen) return;
    el.addEventListener('scrollend', syncVisibleIndex);
    const resizeObserver = new ResizeObserver(() => {
      el.scrollTop = currentIndexRef.current * el.clientHeight;
    });
    resizeObserver.observe(el);
    return () => {
      el.removeEventListener('scrollend', syncVisibleIndex);
      resizeObserver.disconnect();
      if (scrollFrame.current !== null) window.cancelAnimationFrame(scrollFrame.current);
      scrollFrame.current = null;
      if (scrollSettleTimer.current !== null) window.clearTimeout(scrollSettleTimer.current);
      scrollSettleTimer.current = null;
    };
  }, [isVideoViewerOpen, syncVisibleIndex]);

  const scrollToIndex = useCallback((idx: number) => {
    const el = containerRef.current;
    if (!el || !liveVideoPosts.length) return;
    const targetIdx = Math.max(0, Math.min(idx, liveVideoPosts.length - 1));
    el.scrollTo({ top: targetIdx * el.clientHeight, behavior: 'smooth' });
  }, [liveVideoPosts.length]);

  // Keyboard navigation
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const state = useAgroStore.getState();
      const target = e.target as HTMLElement | null;
      if (state.commentPost || state.sharePost || state.selectedSellerModal || state.productDetail
        || target?.closest('input, textarea, select, [contenteditable="true"]')
        || e.altKey || e.ctrlKey || e.metaKey) return;
      // Some browsers expose media keys; mobile OSes may handle them without
      // a DOM event. Do not prevent the native system-volume adjustment.
      if (e.key === 'AudioVolumeUp') changeMuted(false);
      if (e.key === 'ArrowDown' || e.key === 'j') {
        e.preventDefault();
        scrollToIndex(currentIndexRef.current + 1);
      }
      if (e.key === 'ArrowUp' || e.key === 'k') {
        e.preventDefault();
        scrollToIndex(currentIndexRef.current - 1);
      }
    };
    if (isVideoViewerOpen) {
      window.addEventListener('keydown', onKey);
    }
    return () => window.removeEventListener('keydown', onKey);
  }, [closeVideoViewer, isVideoViewerOpen, scrollToIndex, changeMuted]);

  if (!isVideoViewerOpen || liveVideoPosts.length === 0) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        // 100ms: tezroq ochilish — Instagram deyarli instant ochiladi
        transition={{ duration: 0.1 }}
        className="fixed inset-0 z-[100] bg-black"
        onMouseMove={revealControls}
        onTouchStart={revealControls}
      >
        {/* Back button — always visible */}
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={dismissViewer}
          className="absolute left-4 z-30 flex h-10 w-10 items-center justify-center rounded-full bg-black/50 backdrop-blur-md border border-white/20 text-white shadow-lg hover:bg-black/70"
          style={{ top: 'calc(1rem + env(safe-area-inset-top))' }}
          aria-label="Orqaga"
        >
          <ArrowLeft className="w-4 h-4" />
        </motion.button>

        {/* Floating Audio Control — appears on scroll/interaction, auto-hides after inactivity */}
        <AnimatePresence>
          {(showFloatingControls || globalMuted) && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: -10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: -10 }}
              transition={{ duration: 0.2 }}
              className="absolute right-4 z-30 flex items-center gap-2"
              style={{ top: 'calc(1rem + env(safe-area-inset-top))' }}
            >
              {/* Mute toggle */}
              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={() => changeMuted(!globalMuted)}
                className="flex h-10 w-10 items-center justify-center rounded-full bg-black/50 backdrop-blur-md border border-white/20 text-white shadow-lg hover:bg-black/70 transition-colors"
                title={globalMuted ? 'Ovozni yoqish' : "Ovozni o'chirish"}
                aria-label={globalMuted ? 'Ovozni yoqish' : "Ovozni o'chirish"}
              >
                {globalMuted ? (
                  <VolumeX className="w-4 h-4 text-red-400" />
                ) : (
                  <Volume2 className="w-4 h-4 text-white" />
                )}
              </motion.button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Scroll container */}
        <div
          ref={containerRef}
          onScroll={handleScroll}
          className="w-full h-full overflow-y-auto no-scrollbar"
          style={{
            scrollSnapType: 'y mandatory',
            height: '100dvh',
            WebkitOverflowScrolling: 'touch',
            overscrollBehaviorY: 'contain',
            scrollbarWidth: 'none',
            msOverflowStyle: 'none',
            // GPU layer — butun scroll container bitta compositor layerida bo'ladi
            willChange: 'scroll-position',
            transform: 'translateZ(0)',
            // Mobil: touch event'larni JS kutmasdan CSS darajasida qayta ishlaydi
            // Bu scroll boshlanishidagi 300ms lagni yo'q qiladi
            touchAction: 'pan-y',
          } as React.CSSProperties}
        >
          {liveVideoPosts.map((post, idx) => {
            const preloadMode = getPreloadMode(idx, renderedIndex, isSlowConnection);
            // Only mount the real slide (with its <video> element) for the
            // active slide and its immediate neighbors. Farther slides stay
            // as cheap placeholders so opening the viewer doesn't force React
            // to mount every video component in the feed at once.
            const isNearby = Math.abs(idx - renderedIndex) <= 1;
            return (
              <div
                key={post.id}
                data-index={idx}
                style={{
                  scrollSnapAlign: 'start',
                  scrollSnapStop: 'always' as const,
                  height: '100dvh',
                  flexShrink: 0,
                  // contain:layout paint — size yo'q (100dvh bilan muammo yo'q)
                  // strict ishlatilmaydi: dvh height'ni bloklashi mumkin
                  contain: 'layout paint',
                  willChange: isNearby ? 'transform' : 'auto',
                }}
              >
                {isNearby ? (
                  <VideoSlide
                    post={post}
                    isActive={idx === renderedIndex}
                    preloadMode={preloadMode}
                    globalMuted={globalMuted}
                    onAutoplayMuted={handleAutoplayMuted}
                  />
                ) : (
                  <div className="relative w-full h-full bg-black flex items-center justify-center overflow-hidden">
                    {post.posterUrl ? (
                      <img
                        src={post.posterUrl}
                        alt={post.title}
                        // loading=lazy: distant slidlar uchun poster yuklanishini kechiktiradi
                        loading="lazy"
                        decoding="async"
                        className="reels-card reels-visual"
                      />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center gap-3 bg-gradient-to-b from-slate-800 to-slate-950 px-6 text-white/80">
                        <Play className="w-10 h-10" />
                        <span className="text-sm text-center">{post.title}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

      </motion.div>
    </AnimatePresence>
  );
};
