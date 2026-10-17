import React from 'react';
import { CategoryCard } from './home/CategoryCard';
import { useAgroStore } from '../store/useAgroStore';
import { User } from 'lucide-react';

export const DesktopRightSidebar: React.FC = () => {
  const { currentUser, setActiveTab, setAuthPromptOpen } = useAgroStore();

  return (
    <aside aria-label="Siz uchun" className="hidden xl:block w-[280px] shrink-0 self-start sticky top-8 max-h-[calc(100dvh-4rem)] overflow-y-auto space-y-7 select-none pb-4">
      {/* Logged in User Quick Bar (Instagram style) */}
      <div className="flex items-center justify-between gap-3 py-2">
        {currentUser ? (
          <button
            onClick={() => setActiveTab('profile')}
            className="flex items-center gap-3 text-left min-w-0 hover:opacity-80 transition-opacity"
          >
            {currentUser.avatar ? (
              <img
                src={currentUser.avatar}
                alt={currentUser.name}
                className="w-11 h-11 rounded-full object-cover border-2 border-slate-100 shrink-0 shadow-sm"
                onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
              />
            ) : (
              <div className="w-11 h-11 rounded-full border-2 border-slate-100 shrink-0 shadow-sm bg-gradient-to-br from-[#D84315] via-[#D32F2F] to-[#B71C1C] text-white font-black text-sm flex items-center justify-center">
                {(currentUser.name || 'U').charAt(0).toUpperCase()}
              </div>
            )}
            <div className="min-w-0">
              <div className="flex items-center gap-1">
                <span className="font-bold text-sm text-[#111827] truncate">{currentUser.name}</span>
              </div>
              <span className="text-xs text-slate-500 font-medium block truncate">@{currentUser.handle || 'sotuvchi'}</span>
            </div>
          </button>
        ) : (
          <button
            onClick={() => setAuthPromptOpen(true)}
            className="w-full py-3 rounded-lg bg-[#111827] text-white text-sm font-bold hover:bg-[#D84315] transition-colors flex items-center justify-center gap-2"
          >
            <User className="w-4 h-4" />
            <span>Kirish / Profil</span>
          </button>
        )}
      </div>

      {/* Categories Widget */}
      <CategoryCard />

      {/* Footer info */}
      <div className="px-2 text-[11px] text-slate-400 space-y-1.5 pt-1 font-medium">
        <p>© 2026 MollBazar Marketplace Inc.</p>
        <p className="text-[10px] text-slate-400">
          Sotuvchi va xaridorni yagona raqamli bozorda bog'laymiz.
        </p>
        <div className="pt-1 flex flex-wrap gap-2 text-[10px]">
          <a
            href="https://mollbazar.uz/privacy-policy"
            className="text-slate-500 hover:text-[#D84315] hover:underline font-bold transition-colors"
          >
            Maxfiylik siyosati (Privacy Policy)
          </a>
        </div>
      </div>
    </aside>
  );
};
