import React from 'react';
import { CheckCircle2, MapPin, MoreHorizontal } from 'lucide-react';

interface PostHeaderProps {
  sellerAvatar: string;
  sellerName: string;
  verified: boolean;
  location: string;
  date: string;
  categoryName: string;
  isFollowing?: boolean;
  onToggleFollow?: () => void;
  onMoreClick?: () => void;
}

export const PostHeader: React.FC<PostHeaderProps> = ({
  sellerAvatar,
  sellerName,
  verified,
  location,
  date,
  categoryName,
  isFollowing,
  onToggleFollow,
  onMoreClick,
}) => {
  return (
    <div className="px-4 py-3.5 flex items-center justify-between border-b border-slate-100/80">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-slate-100 shrink-0">
          <img
            src={sellerAvatar}
            alt={sellerName}
            className="w-full h-full object-cover"
          />
        </div>
        <div>
          <div className="flex items-center gap-2 leading-tight flex-wrap">
            <span className="font-bold text-[14px] text-[#111827]">{sellerName}</span>
            {verified && (
              <CheckCircle2 className="w-3.5 h-3.5 text-blue-500 fill-blue-50 shrink-0" />
            )}
            {onToggleFollow && (
              <button
                onClick={onToggleFollow}
                className={`text-[12px] font-bold transition-all px-2.5 py-0.5 rounded-full ${
                  isFollowing
                    ? 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    : 'bg-sky-50 text-sky-600 hover:bg-sky-100 font-black'
                }`}
              >
                {isFollowing ? '✓ Obunadasiz' : '+ Obuna bo\'lish'}
              </button>
            )}
          </div>
          <div className="flex items-center gap-1 text-[11px] text-slate-400 mt-0.5 font-medium">
            <MapPin className="w-3 h-3 text-[#E53935]" />
            <span>{location}</span>
            <span className="mx-0.5">•</span>
            <span>{date}</span>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <span className="px-2.5 py-1 rounded-full bg-slate-100 text-[11px] font-semibold text-slate-600">
          {categoryName}
        </span>
        <button
          onClick={onMoreClick}
          className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-full transition-colors"
        >
          <MoreHorizontal className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
};
