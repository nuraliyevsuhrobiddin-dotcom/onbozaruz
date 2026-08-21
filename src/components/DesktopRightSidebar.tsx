import React from 'react';
import { CategoryCard } from './home/CategoryCard';
import { useAgroStore } from '../store/useAgroStore';
import { CheckCircle2, User } from 'lucide-react';

export const DesktopRightSidebar: React.FC = () => {
  const { currentUser, setActiveTab, setAuthPromptOpen } = useAgroStore();

  return (
    <aside className="hidden lg:block w-[280px] shrink-0 sticky top-4 space-y-4 select-none pb-8">
      {/* Logged in User Quick Bar (Instagram style) */}
      <div className="bg-white rounded-[22px] border border-slate-200/80 p-3.5 shadow-sm flex items-center justify-between gap-3">
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
                <span className="font-extrabold text-xs text-[#111827] truncate">{currentUser.name}</span>
                <CheckCircle2 className="w-3.5 h-3.5 text-blue-500 fill-blue-50 shrink-0" />
              </div>
              <span className="text-[11px] text-slate-400 font-medium block truncate">@{currentUser.handle || 'sotuvchi'}</span>
            </div>
          </button>
        ) : (
          <button
            onClick={() => setAuthPromptOpen(true)}
            className="w-full py-2.5 rounded-xl bg-[#111827] text-white text-xs font-black hover:bg-[#D84315] transition-colors flex items-center justify-center gap-2"
          >
            <User className="w-4 h-4" />
            <span>Kirish / Profil</span>
          </button>
        )}
      </div>

      {/* Categories Widget */}
      <CategoryCard />

      {/* Footer info */}
      <div className="px-2 text-[11px] text-slate-400 space-y-1 pt-1 font-medium">
        <p>© 2026 OnBozar Marketplace Inc.</p>
        <p className="text-[10px] text-slate-400">
          Sotuvchi va xaridorni yagona raqamli bozorda bog'laymiz.
        </p>
      </div>
    </aside>
  );
};
