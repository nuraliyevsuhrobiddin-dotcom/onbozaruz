import React from 'react';
import { Heart, MessageCircle } from 'lucide-react';
import { useAgroStore } from '../store/useAgroStore';

export const InstagramHeader: React.FC = () => {
  const { setNotificationsOpen, showToast, unreadNotificationsCount } = useAgroStore();

  return (
    <header className="sticky top-0 z-40 w-full bg-white border-b border-slate-200/80 mobile-safe-header flex items-center justify-center px-4 select-none shadow-sm">
      <div className="w-full max-w-xl flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <img src="/logo.png" alt="OnBozor" className="w-8 h-8 rounded-[10px] object-cover shadow-sm" />
        </div>

        <div className="flex-1 text-left">
          <span className="font-extrabold text-lg tracking-tight text-[#111111]">OnBozor</span>
        </div>

        <div className="flex items-center gap-2 absolute right-4">
          <button
            onClick={() => setNotificationsOpen(true)}
            className="relative p-2 rounded-full text-[#111111] hover:bg-slate-100 transition-colors"
          >
            <Heart className="w-5 h-5 stroke-[1.75]" />
            {unreadNotificationsCount > 0 && (
              <span className="absolute top-0.5 right-0.5 min-w-[16px] h-4 px-1 rounded-full bg-[#D84315] text-white text-[9px] font-black flex items-center justify-center">
                {unreadNotificationsCount > 9 ? '9+' : unreadNotificationsCount}
              </span>
            )}
          </button>

          <button
            onClick={() => showToast("Direct Chat tez kunda ishga tushadi")}
            aria-label="Direct Chat"
            title="Tez kunda ishga tushadi"
            className="p-2 rounded-full text-[#111111] hover:bg-slate-100 transition-colors"
          >
            <MessageCircle className="w-5 h-5 stroke-[1.75]" />
          </button>
        </div>
      </div>
    </header>
  );
};
