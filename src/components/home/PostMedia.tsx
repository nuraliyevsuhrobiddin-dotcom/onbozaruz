import React, { useState } from 'react';
import { Heart } from 'lucide-react';
import confetti from 'canvas-confetti';
import { VideoPlayer } from '../ui/VideoPlayer';

interface PostMediaProps {
  type: 'image' | 'video';
  mediaUrl: string;
  posterUrl?: string;
  title: string;
  price: string;
  onDoubleTapLike?: () => void;
  onClickMedia?: () => void;
}

export const PostMedia: React.FC<PostMediaProps> = ({
  type,
  mediaUrl,
  posterUrl,
  title,
  price,
  onDoubleTapLike,
  onClickMedia,
}) => {
  const [showHeartAnim, setShowHeartAnim] = useState(false);

  const handleDoubleTap = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowHeartAnim(true);
    if (onDoubleTapLike) onDoubleTapLike();

    confetti({
      particleCount: 20,
      spread: 50,
      origin: { y: 0.6 },
      colors: ['#E53935', '#FF6B6B', '#FFFFFF'],
      disableForReducedMotion: true,
    });
    setTimeout(() => setShowHeartAnim(false), 800);
  };

  return (
    <div className="relative w-full overflow-hidden my-2" onClick={onClickMedia} onDoubleClick={handleDoubleTap}>
      <div className="w-full bg-white rounded-[18px] border border-slate-200/80 shadow-sm overflow-hidden">
        <div className={`w-full max-h-[680px] bg-slate-900 overflow-hidden ${type === 'video' ? 'aspect-[9/16]' : 'aspect-[16/10]'}`}>
          {type === 'video' ? (
            <VideoPlayer src={mediaUrl} poster={posterUrl} fit="cover" />
          ) : (
            <img src={mediaUrl} alt={title} loading="lazy" className="w-full h-full object-contain" />
          )}
        </div>
      </div>

      {/* Clean Price Tag Badge */}
      <div className="absolute top-3 left-3 bg-[#111827]/80 text-white px-3.5 py-1.5 rounded-full text-[12px] font-black tracking-tight shadow-md border border-white/10">
        <span className="text-[#22C55E]">{price}</span>
      </div>

      {/* Double-tap heart pulse animation */}
      {showHeartAnim && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20">
          <Heart className="w-24 h-24 text-white fill-[#E53935] drop-shadow-2xl animate-heart-pulse" />
        </div>
      )}
    </div>
  );
};
