import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Volume2, VolumeX, Play, AlertTriangle, RefreshCw, Loader2 } from 'lucide-react';
import { useVideoFrame } from '../../hooks/useVideoFrame';
import { useVideoPlayback } from '../../hooks/useVideoPlayback';
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
  const [isMuted, setIsMuted] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [isBuffering, setIsBuffering] = useState(false);
  const [retryKey, setRetryKey] = useState(0);
  const [aspectRatio, setAspectRatio] = useState<number | null>(null);
  const isVideoViewerOpen = useAgroStore((state) => state.isVideoViewerOpen);
  const [isVisible, setIsVisible] = useState(false);
  const [posterFailed, setPosterFailed] = useState(false);
  const [hasBeenNear, setHasBeenNear] = useState(false);

  // Lazy-attach source once near viewport (within 600px).
  // Once loaded, keep source attached so video frame does not turn black or re-request.
  const activeSrc = hasBeenNear ? src : undefined;
  const isActive = isVisible && !isVideoViewerOpen && Boolean(activeSrc);

  const hasFrame = useVideoFrame(videoRef, activeSrc, retryKey);
  useVideoPlayback(videoRef, activeSrc, isActive, isMuted, retryKey);

  // Reset state on new source or retry
  useEffect(() => {
    setHasError(false);
    setIsPlaying(false);
    setIsBuffering(false);
    setPosterFailed(false);
    setAspectRatio(null);
  }, [src, poster, retryKey]);

  // Viewport proximity observer
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    if (typeof IntersectionObserver === 'undefined') {
      setHasBeenNear(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setHasBeenNear(true);
        }
      },
      { rootMargin: '600px 0px', threshold: 0 }
    );

    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  // 50% visibility observer for feed autoplay
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    if (typeof IntersectionObserver === 'undefined') {
      setIsVisible(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsVisible(entry.isIntersecting && entry.intersectionRatio >= 0.5);
      },
      { threshold: 0.5 }
    );

    observer.observe(container);
    return () => observer.disconnect();
  }, []);

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
      {/* Blurred poster background so videos never have harsh pitch-black borders */}
      {bgPoster ? (
        <div
          aria-hidden="true"
          className="absolute inset-[-20px] bg-cover bg-center opacity-40 blur-2xl scale-110 pointer-events-none z-0"
          style={{ backgroundImage: `url(${bgPoster})` }}
        />
      ) : (
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-[radial-gradient(circle_at_center,_#334155,_#020617_72%)] pointer-events-none z-0"
        />
      )}

      {/* Video Element */}
      <video
        key={retryKey}
        ref={videoRef}
        src={activeSrc}
        poster={poster}
        loop
        muted={!isActive || isMuted}
        playsInline
        webkit-playsinline="true"
        x5-playsinline="true"
        x5-video-player-type="h5-page"
        preload={isActive ? 'auto' : hasBeenNear ? 'metadata' : 'none'}
        onError={(e) => {
          if (activeSrc && e.currentTarget.error) setHasError(true);
          setIsBuffering(false);
        }}
        onWaiting={() => { if (isActive) setIsBuffering(true); }}
        onStalled={() => { if (isActive) setIsBuffering(true); }}
        onCanPlay={() => { setIsBuffering(false); }}
        onPlaying={() => { setIsPlaying(true); setIsBuffering(false); }}
        onLoadedMetadata={(event) => {
          const video = event.currentTarget;
          if (video.videoWidth > 0 && video.videoHeight > 0) {
            setAspectRatio(video.videoWidth / video.videoHeight);
          }
        }}
        onPlay={() => { setIsPlaying(true); setIsBuffering(false); }}
        onPause={() => setIsPlaying(false)}
        className={`relative z-[1] w-full h-full max-h-[540px] ${
          fit === 'cover' ? 'object-cover' : 'object-contain'
        }`}
      />

      {/* Poster overlay until first frame decodes */}
      {!hasFrame && !hasError && (
        <div data-video-placeholder className="absolute inset-0 z-[2] pointer-events-none flex items-center justify-center bg-slate-900/60 backdrop-blur-[1px]">
          {poster && !posterFailed ? (
            <img
              src={poster}
              alt="Video thumbnail"
              onError={() => setPosterFailed(true)}
              className={`w-full h-full ${fit === 'cover' ? 'object-cover' : 'object-contain'}`}
            />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center text-white/70 bg-gradient-to-b from-slate-900 via-slate-800 to-slate-950">
              {isActive || isBuffering ? (
                <Loader2 className="w-8 h-8 text-[#D84315] animate-spin" />
              ) : (
                <div className="w-12 h-12 rounded-full bg-black/50 backdrop-blur-md flex items-center justify-center border border-white/20 shadow-lg">
                  <Play className="w-6 h-6 text-white/90 fill-white/90 translate-x-0.5" />
                </div>
              )}
            </div>
          )}
        </div>
      )}

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
      {isActive && hasFrame && isBuffering && !hasError && (
        <div className="absolute inset-0 z-10 flex items-center justify-center pointer-events-none">
          <div className="w-12 h-12 rounded-full bg-black/60 backdrop-blur-md flex items-center justify-center">
            <Loader2 className="w-6 h-6 text-white animate-spin" />
          </div>
        </div>
      )}

      {/* Paused indicator overlay */}
      {!isPlaying && !hasError && !isBuffering && hasFrame && (
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
