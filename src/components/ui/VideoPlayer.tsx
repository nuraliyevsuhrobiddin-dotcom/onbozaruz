import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Volume2, VolumeX, Play, AlertTriangle } from 'lucide-react';

interface VideoPlayerProps {
  src: string;
  poster?: string;
  className?: string;
  fit?: 'contain' | 'cover' | 'auto';
}

export const VideoPlayer: React.FC<VideoPlayerProps> = ({
  src,
  poster,
  className = '',
  fit = 'contain',
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
  // src o'zgarganda observer qayta tiklanadi
  useEffect(() => {
    const video = videoRef.current;
    const container = containerRef.current;
    if (!video || !container) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && entry.intersectionRatio >= 0.5) {
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
      { threshold: 0.5 }
    );

    observer.observe(container);
    return () => observer.disconnect();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [src]);

  const togglePlay = useCallback(() => {
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

    // Ovozni yoqish foydalanuvchi bosishi orqali — audio autoplay siyosatini chetlab o'tadi
    if (!nextMuted) {
      video.volume = 1;
      video.play().then(() => setIsPlaying(true)).catch(() => {});
    }
  }, [isMuted]);

  return (
    <div
      ref={containerRef}
      onClick={togglePlay}
      className={`relative overflow-hidden cursor-pointer ${fit === 'auto' ? 'flex justify-center bg-white' : 'h-full bg-slate-900'} ${className}`}
      style={fit === 'auto' && aspectRatio ? { aspectRatio: `${aspectRatio}`, maxHeight: 'calc(100vh - 190px)' } : undefined}
    >
      {fit === 'contain' && poster && (
        <div
          aria-hidden="true"
          className="absolute inset-[-28px] bg-cover bg-center opacity-45 blur-2xl scale-110"
          style={{ backgroundImage: `url(${poster})` }}
        />
      )}
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
          if (fit === 'auto' && video.videoWidth > 0 && video.videoHeight > 0) {
            setAspectRatio(video.videoWidth / video.videoHeight);
          }
        }}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        className={`relative z-[1] ${fit === 'auto' ? 'h-auto max-h-[calc(100vh-190px)] w-auto max-w-full object-contain' : 'h-full w-full'} ${fit === 'cover' ? 'object-cover' : 'object-contain'}`}
      />

      {hasError && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/70 text-white text-center px-4">
          <div className="space-y-2">
            <AlertTriangle className="mx-auto w-10 h-10 text-red-400" />
            <p className="text-sm font-bold">Video yuklanmadi</p>
            <p className="text-[11px] text-slate-200">Iltimos internet aloqasini tekshirib qayta urinib ko'ring.</p>
          </div>
        </div>
      )}

      {/* Paused indicator */}
      {!isPlaying && !hasError && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="w-14 h-14 rounded-full bg-black/50 flex items-center justify-center">
            <Play className="w-7 h-7 text-white fill-white translate-x-0.5" />
          </div>
        </div>
      )}

      {/* Mute button */}
      <button
        onClick={toggleMute}
        aria-label={isMuted ? 'Ovozni yoqish' : "Ovozni o'chirish"}
        className="absolute bottom-3 right-3 w-8 h-8 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-black/80 transition-colors z-10"
      >
        {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
      </button>
    </div>
  );
};
