import React from 'react';

interface ProfileStatsProps {
  postsCount: number;
  viewsCount: string;
  followersCount: string;
  followingCount: string;
  onTabChange: (tab: string) => void;
  showToast: (msg: string) => void;
}

export const ProfileStats: React.FC<ProfileStatsProps> = ({
  postsCount,
  viewsCount,
  followersCount,
  followingCount,
  onTabChange,
  showToast,
}) => {
  return (
    <div className="grid grid-cols-4 gap-1 p-2 bg-white rounded-[22px] border border-slate-200/80 shadow-sm text-center">
      <button
        type="button"
        onClick={() => onTabChange('posts')}
        className="p-2 rounded-[16px] hover:bg-slate-50 transition-colors"
      >
        <span className="font-black text-sm sm:text-base text-[#111827] block">{postsCount}</span>
        <span className="text-[10px] sm:text-[11px] font-bold text-slate-400 uppercase">E'lonlar</span>
      </button>
      <button
        type="button"
        onClick={() => showToast(`${viewsCount} marta ko'rilgan`)}
        className="p-2 rounded-[16px] hover:bg-slate-50 transition-colors"
      >
        <span className="font-black text-sm sm:text-base text-[#111827] block">{viewsCount}</span>
        <span className="text-[10px] sm:text-[11px] font-bold text-slate-400 uppercase">Ko'rildi</span>
      </button>
      <button
        type="button"
        onClick={() => showToast(`${followersCount} obunachi`)}
        className="p-2 rounded-[16px] hover:bg-slate-50 transition-colors"
      >
        <span className="font-black text-sm sm:text-base text-[#111827] block">{followersCount}</span>
        <span className="text-[10px] sm:text-[11px] font-bold text-slate-400 uppercase">Obunachi</span>
      </button>
      <button
        type="button"
        onClick={() => showToast(`${followingCount} ta obuna`)}
        className="p-2 rounded-[16px] hover:bg-slate-50 transition-colors"
      >
        <span className="font-black text-sm sm:text-base text-[#111827] block">{followingCount}</span>
        <span className="text-[10px] sm:text-[11px] font-bold text-slate-400 uppercase">Obuna</span>
      </button>
    </div>
  );
};
