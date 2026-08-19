import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Volume2, VolumeX, Play, AlertTriangle, RefreshCw, Loader2 } from 'lucide-react';
import { useAgroStore } from '../../store/useAgroStore';

interface VideoPlayerProps {
  src: string;
  poster?: string;
  className?: string;
  fit?: 'contain' | 'cover' | 'auto';
  onOpenReels?: () => void;
}

export const VideoPlayer: React.FC<VideoPlayerProps> = ({
  src,
  poster,
  className = '',
  fit = 'contain',
  onOpenReels,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [isBuffering, setIsBuffering] = useState(false);
  const [retryKey, setRetryKey] = useState(0);
  const [aspectRatio, setAspectRatio] = useState<number | null>(null);
  const { isVideoViewerOpen } = useAgroStore();

  // src o'zgarganda xato va play holatini tiklash
  useEffect(() => {
    setHasError(false);
    setIsPlaying(false);
    setIsBuffering(false);
    setAspectRatio(null);
  }, [src, poster, retryKey]);

  // Reels ochilganida feed videolarni to'xtatish va mute qilish
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    if (isVideoViewerOpen) {
      // Reels ochilganida: video mute qil va pause qil
      video.volume = 0;
      video.muted = true;
      video.pause();
    } else {
      // Reels yopilganida: original mute holatiga qaytarish
      video.muted = isMuted;
      video.volume = isMuted ? 0 : 1;
    }
  }, [isVideoViewerOpen, isMuted]);

  // IntersectionObserver — feed da avtomatik ijro/to'xtatish
  // Pero Reels ochilganida auto-play ishlamaydi
  useEffect(() => {
    const video = videoRef.current;
    const container = containerRef.current;
    if (!video || !container) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        // Agar Reels viewer ochilgan bo'lsa, videolarni auto-play qilma
        if (isVideoViewerOpen) {
          video.pause();
          setIsPlaying(false);
          return;
        }

        if (entry.isIntersecting && entry.intersectionRatio >= 0.4) {
          video.play().then(() => setIsPlaying(true)).catch(() => {
            // Muted fallback
            video.muted = true;
            setIsMuted(true);
            video.play().then(() => setIsPlaying(true)).catch(() => {});
          });
        } else {
          video.pause();
          setIsPlaying(false);
          // Bufferingni to'xtatish viewport'dan chiqqanda
          setIsBuffering(false);
        }
      },
      { threshold: 0.4 }
    );

    observer.observe(container);
    return () => observer.disconnect();
  }, [src, retryKey, isVideoViewerOpen]);

  const handleRetry = useCallback(() => {
    setRetryKey((k) => k + 1);
  }, []);

  const togglePlay = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    if (onOpenReels) {
      onOpenReels();
      return;
    }
    if (hasError) return;
    const video = videoRef.current;
    if (!video) return;

    if (video.paused) {
      video.play().then(() => setIsPlaying(true)).catch(() => {});
    } else {
      video.pause();
      setIsPlaying(false);
    }
  }, [hasError, onOpenReels]);

  const toggleMute = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    const video = videoRef.current;
    if (!video) return;

    const nextMuted = !isMuted;
    video.muted = nextMuted;
    setIsMuted(nextMuted);

    if (!nextMuted) {
      video.volume = 1;
      video.play().then(() => setIsPlaying(true)).catch(() => {});
    }
  }, [isMuted]);

  const bgPoster = poster || poster === '' ? poster : undefined;

  return (
    <div
      ref={containerRef}
      onClick={togglePlay}
      className={`relative w-full overflow-hidden cursor-pointer bg-slate-950 flex items-center justify-center select-none ${className}`}
      style={{
        aspectRatio: fit === 'auto' && aspectRatio ? `${aspectRatio}` : '4/5',
        maxHeight: '540px',
        minHeight: '280px',
      }}
    >
      {/* Blurred poster or video background so 9:16 or 16:9 videos never have pitch black side bars */}
      {bgPoster ? (
        <div
          aria-hidden="true"
          className="absolute inset-[-20px] bg-cover bg-center opacity-40 blur-2xl scale-110 pointer-events-none z-0"
          style={{ backgroundImage: `url(${bgPoster})` }}
        />
      ) : (
        // Do not create a second video element here. It would download and decode
        // the same file twice for every card in the feed.
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-[radial-gradient(circle_at_center,_#334155,_#020617_72%)] pointer-events-none z-0"
        />
      )}

      {/* Video Element — key={retryKey} forces a clean element on retry */}
      <video
        key={retryKey}
        ref={videoRef}
        src={src}
        poster={poster}
        loop
        muted={isMuted}
        playsInline
        // Feed cards only need a small amount of data until they become visible.
        preload="metadata"
        onError={() => { setHasError(true); setIsBuffering(false); }}
        onWaiting={() => setIsBuffering(true)}
        onCanPlay={() => setIsBuffering(false)}
        onPlaying={() => { setIsPlaying(true); setIsBuffering(false); }}
        onLoadedMetadata={(event) => {
          const video = event.currentTarget;
          if (video.videoWidth > 0 && video.videoHeight > 0) {
            setAspectRatio(video.videoWidth / video.videoHeight);
          }
        }}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        className={`relative z-[1] w-full h-full max-h-[540px] ${
          fit === 'cover' ? 'object-cover' : 'object-contain'
        }`}
      />

      {/* Error display with retry */}
      {hasError && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-slate-900/90 text-white text-center px-4">
          <div className="space-y-3">
            <AlertTriangle className="mx-auto w-10 h-10 text-amber-400" />
            <p className="text-sm font-bold">Video yuklanmadi</p>
            <p className="text-[11px] text-slate-300">Video formatini yoki aloqani tekshiring</p>
            <button
              onClick={(e) => { e.stopPropagation(); handleRetry(); }}
              className="flex items-center gap-2 mx-auto px-3 py-1.5 rounded-full bg-white/20 hover:bg-white/30 border border-white/30 text-white text-xs font-bold transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Qayta yuklash
            </button>
          </div>
        </div>
      )}

      {/* Buffering spinner */}
      {isBuffering && !hasError && (
        <div className="absolute inset-0 z-10 flex items-center justify-center pointer-events-none">
          <div className="w-12 h-12 rounded-full bg-black/60 backdrop-blur-md flex items-center justify-center">
            <Loader2 className="w-6 h-6 text-white animate-spin" />
          </div>
        </div>
      )}

      {/* Paused indicator overlay */}
      {!isPlaying && !hasError && !isBuffering && (
        <div className="absolute inset-0 z-10 flex items-center justify-center pointer-events-none bg-black/20 backdrop-blur-[1px]">
          <div className="w-14 h-14 rounded-full bg-black/60 backdrop-blur-md flex items-center justify-center shadow-lg border border-white/20">
            <Play className="w-7 h-7 text-white fill-white translate-x-0.5" />
          </div>
        </div>
      )}

      {/* Bottom controls: Instagram-style mute toggle */}
      <div className="absolute bottom-3 right-3 z-20 flex items-center gap-2">
        <button
          onClick={toggleMute}
          aria-label={isMuted ? 'Ovozni yoqish' : "Ovozni o'chirish"}
          className="w-8 h-8 rounded-full bg-black/60 backdrop-blur-md text-white border border-white/20 flex items-center justify-center hover:bg-black/80 transition-colors shadow-md"
        >
          {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4 text-emerald-400" />}
        </button>
      </div>
    </div>
  );
};
