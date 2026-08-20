import React, { useEffect, useRef, useState, useCallback, memo } from 'react';
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

// Official Telegram SVG icon
const TelegramSVG = () => (
  <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current" xmlns="http://www.w3.org/2000/svg">
    <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
  </svg>
);

// ---------------------------------------------------------------------------
// Preload strategy helper
// ---------------------------------------------------------------------------
type PreloadMode = 'active' | 'next' | 'none';

function getPreloadMode(idx: number, currentIndex: number): PreloadMode {
  if (idx === currentIndex) return 'active';
  // Only preload the next video (forward direction), not the previous one.
  // This conserves RAM and avoids downloading content the user scrolled past.
  if (idx === currentIndex + 1) return 'next';
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
  // True only for the brief window right after the viewer opens. Used to
  // hold off the very first play() so it doesn't compete with the open
  // transition — later swipes should never wait for this, since the slide
  // has already been pre-buffering as "next" while the user watched the
  // previous one.
  justOpened: boolean;
  onUnmute?: () => void;
}

// memo prevents re-renders when the parent's state changes but this slide's
// props haven't changed (e.g. globalMuted toggle causes full list re-render).
const VideoSlide: React.FC<SlideProps> = memo(({ post, isActive, preloadMode, globalMuted, justOpened, onUnmute: _onUnmute }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isBuffering, setIsBuffering] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [retryKey, setRetryKey] = useState(0);
  const [showHeart, setShowHeart] = useState(false);
  // True once this slide (active or "next") has had a brief moment to avoid
  // competing with an entrance transition. Gates the preload upgrade from
  // 'metadata' to 'auto' for BOTH roles, so the "next" slide quietly buffers
  // real video data ahead of time — that's what makes a swipe feel instant
  // instead of showing a black screen while the browser starts fetching.
  const [hasSettled, setHasSettled] = useState(false);
  // True once the <video> has actually painted a frame for the current src.
  // Drives the poster/placeholder overlay: it stays up until there is real
  // video content underneath it, so the user never sees raw black.
  const [hasFrame, setHasFrame] = useState(false);
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
  } = useAgroStore();

  const isLiked = likedPostIds.includes(post.id);
  const isSaved = savedPostIds.includes(post.id);
  const isFollowing = followedSellerIds.includes(post.sellerId);
  const isOwnPost = currentUser?.id === post.sellerId;

  // Reset error/frame state when retryKey or src changes
  useEffect(() => {
    setHasError(false);
    setIsBuffering(false);
    setIsPlaying(false);
    setHasFrame(false);
    setPosterFailed(false);
  }, [retryKey, post.mediaUrl]);

  // Settle timer: applies to both the active slide and the pre-buffered
  // "next" slide. A short delay before upgrading preload to 'auto' keeps
  // the very first paint from competing with this slide's entrance.
  useEffect(() => {
    if (preloadMode === 'none') {
      setHasSettled(false);
      return;
    }
    const timer = window.setTimeout(() => setHasSettled(true), 220);
    return () => window.clearTimeout(timer);
  }, [preloadMode]);

  // Active slide: play; inactive: pause + mute completely.
  // On the viewer's initial open we wait for the settle timer so playback
  // doesn't compete with the open transition. On every later swipe we play
  // immediately — this slide was already sitting as "next" and pre-buffering
  // real video data, so there's nothing left to wait for.
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    if (isActive) {
      if (justOpened && !hasSettled) return;

      video.muted = globalMuted;
      video.volume = globalMuted ? 0 : 1;

      const playPromise = video.play();
      if (playPromise !== undefined) {
        playPromise
          .then(() => setIsPlaying(true))
          .catch(() => {
            // Browser policies may block autoplay with sound until user interaction.
            video.muted = true;
            video.volume = 0;
            video.play().then(() => setIsPlaying(true)).catch(() => setIsPlaying(false));
          });
      }
    } else {
      // Immediately silence and pause inactive slides to prevent audio mixing.
      video.volume = 0;
      video.muted = true;
      video.pause();
      setIsPlaying(false);
      setIsBuffering(false);
    }
  }, [isActive, hasSettled, justOpened, globalMuted]);

  // Keep audio state aligned when the viewer mute toggle changes.
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !isActive) return;

    video.muted = globalMuted;
    video.volume = globalMuted ? 0 : 1;

    if (!globalMuted && video.paused) {
      video.play().catch(() => {
        video.muted = true;
        video.volume = 0;
      });
    }
  }, [globalMuted, isActive]);

  // Komponent unmount bo'lganda video ni to'xtatish va ovozni butunlay o'chirish
  useEffect(() => {
    const video = videoRef.current;
    return () => {
      if (video) {
        video.volume = 0;
        video.muted = true;
        video.pause();
        // Remove src to release memory for slides far from current index
        if (!video.paused) video.pause();
      }
    };
  }, []);

  const handleRetry = useCallback(() => {
    setRetryKey((k) => k + 1);
  }, []);

  const handleDoubleTap = useCallback(() => {
    setShowHeart(true);
    if (!isLiked) toggleLikePost(post.id);
    confetti({ particleCount: 25, spread: 55, origin: { y: 0.5 }, colors: ['#E53935', '#FFFFFF'] });
    setTimeout(() => setShowHeart(false), 800);
  }, [isLiked, post.id, toggleLikePost]);

  const handleSingleTap = useCallback(() => {
    const video = videoRef.current;
    if (!video || hasError) return;
    if (video.paused) {
      video.play().then(() => setIsPlaying(true)).catch(() => {});
    } else {
      video.pause();
      setIsPlaying(false);
    }
  }, [hasError]);

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

  // Determine video src: only attach for active + next slides.
  // Removing src from distant slides lets the browser reclaim memory and
  // network connections. preload="none" alone is not always honored.
  const videoSrc = preloadMode !== 'none' ? post.mediaUrl : undefined;

  // Poster: use only the dedicated thumbnail, not the video URL itself.
  // Using the video URL as a poster causes a second network request for the
  // same resource, doubling network usage on mobile.
  const posterSrc = post.posterUrl || undefined;

  // preload attribute mapped to mode: both 'active' and 'next' start at a
  // light 'metadata' fetch and upgrade to a full 'auto' buffer once settled
  // — this is what lets the "next" video have real data ready before the
  // user ever swipes to it.
  const preloadAttr = preloadMode === 'none' ? 'none' : hasSettled ? 'auto' : 'metadata';

  return (
    <div
      className="relative w-full h-full flex items-center justify-center bg-black overflow-hidden select-none"
      style={{ height: '100dvh' }}
    >
      {/* Container: full on mobile, centered 9:16 card on desktop */}
      <div
        className="relative bg-slate-950 overflow-hidden flex items-center justify-center w-full h-full sm:h-[min(92dvh,760px)] sm:w-auto sm:aspect-[9/16] sm:rounded-[24px] shadow-2xl"
      >
        {/* Blurred background backdrop — use only poster, never the video URL */}
        {posterSrc && (
          <div
            aria-hidden="true"
            className="absolute inset-[-24px] bg-cover bg-center opacity-40 blur-3xl scale-110 pointer-events-none"
            style={{ backgroundImage: `url(${posterSrc})` }}
          />
        )}

        {/* Video / Image */}
        {post.type === 'video' ? (
          <>
            {/* key={retryKey} forces a fresh <video> element on retry,
                clearing any stalled network state from the previous attempt. */}
            <video
              key={retryKey}
              ref={videoRef}
              src={videoSrc}
              poster={posterSrc}
              loop
              muted={false}
              playsInline
              preload={preloadAttr}
              onClick={handleClick}
              onLoadedData={() => setHasFrame(true)}
              onPlay={() => { setIsPlaying(true); setIsBuffering(false); }}
              onPause={() => setIsPlaying(false)}
              onWaiting={() => { if (isActive) setIsBuffering(true); }}
              onCanPlay={() => { setIsBuffering(false); setHasFrame(true); }}
              onPlaying={() => { setIsPlaying(true); setIsBuffering(false); setHasFrame(true); }}
              onError={() => { setHasError(true); setIsBuffering(false); }}
              className="relative z-[1] w-full h-full object-cover sm:object-contain cursor-pointer"
            />

            {/* Poster/placeholder — covers the video until it has actually
                painted a frame, so a swipe never reveals raw black while the
                next clip is still starting to buffer. */}
            {!hasFrame && !hasError && (
              <div className="absolute inset-0 z-[1] pointer-events-none">
                {posterSrc && !posterFailed ? (
                  <img
                    src={posterSrc}
                    alt={post.title}
                    onError={() => setPosterFailed(true)}
                    className="w-full h-full object-cover sm:object-contain"
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-slate-800 via-slate-900 to-black flex items-center justify-center">
                    <Loader2 className="w-8 h-8 text-white/50 animate-spin" />
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
            className="relative z-[1] w-full h-full object-cover cursor-pointer"
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

  // Feeddagi like/save o'zgarishlari viewer ichidagi post snapshotini ham darhol yangilaydi
  const liveVideoPosts = videoViewerPosts.map((viewerPost) =>
    posts.find((post) => post.id === viewerPost.id) || viewerPost
  );

  const [currentIndex, setCurrentIndex] = useState(0);
  // Ovozli boshlanadi — foydalanuvchi bosib kirdi (user gesture)
  const [globalMuted, setGlobalMuted] = useState(false);
  // True only for a brief window right after the viewer opens — see
  // VideoSlide's `justOpened` prop for why this exists.
  const [justOpened, setJustOpened] = useState(true);
  // Floating control visibility: appears on scroll, hides after inactivity
  const [showFloatingControls, setShowFloatingControls] = useState(true);
  const floatingControlsTimer = useRef<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const slideRefs = useRef<Map<number, HTMLDivElement>>(new Map());
  const isScrolling = useRef(false);
  const wheelTimeout = useRef<number | null>(null);
  const lastWheelTime = useRef(0);
  const scrollSettleTimer = useRef<number | null>(null);
  // Keep a ref to currentIndex so the IntersectionObserver callback can read
  // the latest value without being recreated on every index change.
  const currentIndexRef = useRef(currentIndex);

  useEffect(() => {
    currentIndexRef.current = currentIndex;
  }, [currentIndex]);

  // Sync start index when viewer opens & position container cleanly
  useEffect(() => {
    if (!isVideoViewerOpen) return;
    setCurrentIndex(videoViewerStartIndex);
    currentIndexRef.current = videoViewerStartIndex;
    setGlobalMuted(false);
    setShowFloatingControls(true);

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

  // "Just opened" window: slightly longer than VideoSlide's own 220ms settle
  // timer so it reliably covers the open transition, then clears so every
  // later swipe plays without an artificial delay.
  useEffect(() => {
    if (!isVideoViewerOpen) return;
    setJustOpened(true);
    const timer = window.setTimeout(() => setJustOpened(false), 260);
    return () => window.clearTimeout(timer);
  }, [isVideoViewerOpen]);

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

  // Lock body scroll while viewer is open
  useEffect(() => {
    if (isVideoViewerOpen) {
      lockBodyScroll();
    }
    return () => {
      unlockBodyScroll();
    };
  }, [isVideoViewerOpen]);

  // History API: push state when reels open so phone back button closes viewer
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

  // IntersectionObserver to detect active slide (threshold 60% visibility).
  // IMPORTANT: This effect does NOT depend on `currentIndex` — it uses the
  // `currentIndexRef` instead. This prevents the observer from being torn
  // down and recreated on every scroll step, which caused jitter and missed
  // updates on slow devices.
  useEffect(() => {
    const container = containerRef.current;
    if (!container || !isVideoViewerOpen || liveVideoPosts.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (isScrolling.current) return;
        let bestEntry: IntersectionObserverEntry | null = null;
        for (const entry of entries) {
          if (entry.isIntersecting) {
            if (!bestEntry || entry.intersectionRatio > bestEntry.intersectionRatio) {
              bestEntry = entry;
            }
          }
        }
        if (bestEntry) {
          const idxStr = bestEntry.target.getAttribute('data-index');
          if (idxStr !== null) {
            const idx = parseInt(idxStr, 10);
            if (!isNaN(idx) && idx !== currentIndexRef.current) {
              currentIndexRef.current = idx;
              setCurrentIndex(idx);
            }
          }
        }
      },
      {
        root: container,
        threshold: [0.5, 0.6, 0.7], // Multiple thresholds for more reliable detection
      }
    );

    slideRefs.current.forEach((el) => {
      if (el) observer.observe(el);
    });

    return () => {
      observer.disconnect();
    };
    // liveVideoPosts.length is intentionally the only dep: the observer is
    // rebuilt only when the list grows (infinite scroll), not on every swipe.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isVideoViewerOpen, liveVideoPosts.length]);

  // Smoothly scroll to target index (for keyboard, wheel, dot navigation)
  const scrollToIndex = useCallback((idx: number) => {
    const el = containerRef.current;
    if (!el || liveVideoPosts.length === 0) return;
    const targetIdx = Math.max(0, Math.min(idx, liveVideoPosts.length - 1));

    isScrolling.current = true;
    const viewportHeight = el.clientHeight || window.innerHeight;
    el.scrollTo({ top: targetIdx * viewportHeight, behavior: 'smooth' });
    currentIndexRef.current = targetIdx;
    setCurrentIndex(targetIdx);

    if (wheelTimeout.current) window.clearTimeout(wheelTimeout.current);
    wheelTimeout.current = window.setTimeout(() => {
      isScrolling.current = false;
      wheelTimeout.current = null;
    }, 500);
  }, [liveVideoPosts.length]);

  // Native scroll settlement handler for touch & momentum scrolling.
  // 120ms debounce (vs 80ms before) gives momentum scroll time to settle
  // on mid-range Android devices before we commit to an index.
  const handleScroll = useCallback(() => {
    revealControls();

    if (isScrolling.current || !containerRef.current) return;

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

      if (settledIdx !== currentIndexRef.current) {
        currentIndexRef.current = settledIdx;
        setCurrentIndex(settledIdx);
      }
    }, 120);
  }, [liveVideoPosts.length, revealControls]);

  // Keyboard navigation
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') return closeVideoViewer();
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
  }, [closeVideoViewer, isVideoViewerOpen, scrollToIndex]);

  // Mouse wheel navigation (Desktop)
  const handleWheelNav = (e: React.WheelEvent) => {
    revealControls();

    if (isScrolling.current) return;
    const now = Date.now();
    if (now - lastWheelTime.current < 400) return;
    lastWheelTime.current = now;
    if (e.deltaY > 40) {
      scrollToIndex(currentIndexRef.current + 1);
    } else if (e.deltaY < -40) {
      scrollToIndex(currentIndexRef.current - 1);
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
        onMouseMove={revealControls}
        onTouchStart={revealControls}
      >
        {/* Back button — always visible */}
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={closeVideoViewer}
          className="absolute left-4 z-30 flex h-10 w-10 items-center justify-center rounded-full bg-black/50 backdrop-blur-md border border-white/20 text-white shadow-lg hover:bg-black/70"
          style={{ top: 'calc(1rem + env(safe-area-inset-top))' }}
          aria-label="Orqaga"
        >
          <ArrowLeft className="w-4 h-4" />
        </motion.button>

        {/* Floating Audio Control — appears on scroll/interaction, auto-hides after inactivity */}
        <AnimatePresence>
          {showFloatingControls && (
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
                onClick={() => {
                  setGlobalMuted((prev) => !prev);
                  revealControls();
                }}
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
          {liveVideoPosts.map((post, idx) => {
            const preloadMode = getPreloadMode(idx, currentIndex);
            // Only mount the real slide (with its <video> element) for the
            // active slide and its immediate neighbors. Farther slides stay
            // as cheap placeholders so opening the viewer doesn't force React
            // to mount every video component in the feed at once.
            const isNearby = Math.abs(idx - currentIndex) <= 1;
            return (
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
                  scrollSnapStop: 'always' as const,
                  height: '100dvh',
                  flexShrink: 0,
                }}
              >
                {isNearby ? (
                  <VideoSlide
                    post={post}
                    isActive={idx === currentIndex}
                    preloadMode={preloadMode}
                    globalMuted={globalMuted}
                    justOpened={justOpened}
                    onUnmute={() => setGlobalMuted(false)}
                  />
                ) : (
                  <div className="w-full h-full bg-black" />
                )}
              </div>
            );
          })}
        </div>

      </motion.div>
    </AnimatePresence>
  );
};
