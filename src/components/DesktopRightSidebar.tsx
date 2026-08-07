import React from 'react';
import { CategoryCard } from './home/CategoryCard';

export const DesktopRightSidebar: React.FC = () => {
  return (
    <aside className="hidden lg:block w-[260px] shrink-0 sticky top-4 space-y-4 select-none pb-8">
      <CategoryCard />

      <div className="px-2 text-[11px] text-slate-400 space-y-1 pt-1 font-medium">
        <p>© 2026 OnBozor Agro Marketplace Inc.</p>
        <p className="text-[10px] text-slate-400">
          Fermer va xaridorni yagona raqamli bozorda bog'laymiz.
        </p>
      </div>
    </aside>
  );
};
