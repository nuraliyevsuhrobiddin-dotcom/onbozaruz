import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Volume2, VolumeX, Play, AlertTriangle } from 'lucide-react';

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
  const [aspectRatio, setAspectRatio] = useState<number | null>(null);

  // src o'zgarganda xato va play holatini tiklash
  useEffect(() => {
    setHasError(false);
    setIsPlaying(false);
    setAspectRatio(null);
  }, [src, poster]);

  // IntersectionObserver — feed da avtomatik ijro/to'xtatish
  useEffect(() => {
    const video = videoRef.current;
    const container = containerRef.current;
    if (!video || !container) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
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
        }
      },
      { threshold: 0.4 }
    );

    observer.observe(container);
    return () => observer.disconnect();
  }, [src]);

  const togglePlay = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    if (hasError) return;
    const video = videoRef.current;
    if (!video) return;

    if (video.paused) {
      video.play().then(() => setIsPlaying(true)).catch(() => {});
    } else {
      video.pause();
      setIsPlaying(false);
    }
  }, [hasError]);

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
      {/* Blurred poster background so 9:16 or 16:9 videos blend seamlessly */}
      {bgPoster && (
        <div
          aria-hidden="true"
          className="absolute inset-[-20px] bg-cover bg-center opacity-30 blur-2xl scale-110 pointer-events-none"
          style={{ backgroundImage: `url(${bgPoster})` }}
        />
      )}

      {/* Video Element */}
      <video
        ref={videoRef}
        src={src}
        poster={poster}
        loop
        muted={isMuted}
        playsInline
        preload="metadata"
        onError={() => setHasError(true)}
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

      {/* Error display */}
      {hasError && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-slate-900/90 text-white text-center px-4">
          <div className="space-y-2">
            <AlertTriangle className="mx-auto w-10 h-10 text-amber-400" />
            <p className="text-sm font-bold">Video yuklanmadi</p>
            <p className="text-[11px] text-slate-300">Video formatini yoki aloqani tekshiring</p>
          </div>
        </div>
      )}

      {/* Paused indicator overlay */}
      {!isPlaying && !hasError && (
        <div className="absolute inset-0 z-10 flex items-center justify-center pointer-events-none bg-black/20 backdrop-blur-[1px]">
          <div className="w-14 h-14 rounded-full bg-black/60 backdrop-blur-md flex items-center justify-center shadow-lg border border-white/20">
            <Play className="w-7 h-7 text-white fill-white translate-x-0.5" />
          </div>
        </div>
      )}

      {/* Bottom controls: Mute button & Fullscreen Reels trigger */}
      <div className="absolute bottom-3 right-3 z-20 flex items-center gap-2">
        {onOpenReels && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onOpenReels();
            }}
            className="px-2.5 py-1.5 rounded-full bg-black/60 backdrop-blur-md text-white text-[11px] font-black border border-white/20 flex items-center gap-1.5 hover:bg-black/80 transition-colors shadow-md"
          >
            <span>Reels 🎬</span>
          </button>
        )}
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

