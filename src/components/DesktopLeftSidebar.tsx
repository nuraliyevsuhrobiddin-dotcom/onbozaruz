import React from 'react';
import {
  Home,
  Search,
  Tag,
  PlusSquare,
  User,
  ShieldCheck,
} from 'lucide-react';
import { useAgroStore, NavTab } from '../store/useAgroStore';

export const DesktopLeftSidebar: React.FC = () => {
  const {
    activeTab,
    setActiveTab,
    setCreateModalOpen,
    isAdminUser,
  } = useAgroStore();

  const handleNavClick = (tab: NavTab) => {
    setActiveTab(tab);
  };

  return (
    <aside className="hidden lg:flex flex-col fixed top-0 left-0 h-screen w-[80px] bg-white border-r border-slate-200/80 z-30 py-6 select-none">
      <div className="flex flex-col items-center gap-4">
        <div onClick={() => handleNavClick('home')} className="cursor-pointer p-1">
          <img src="/logo.png" alt="OnBozor" className="w-10 h-10 rounded-[12px] object-cover shadow-md hover:scale-105 transition-transform" />
        </div>

        <nav className="flex flex-col items-center justify-start gap-3 mt-4">
          <button title="Asosiy" onClick={() => handleNavClick('home')} className={`p-3 rounded-lg ${activeTab === 'home' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100'}`}>
            <Home className={`w-5 h-5 ${activeTab === 'home' ? 'stroke-[2.5]' : 'stroke-[1.75]'}`} />
          </button>

          <button title="Qidiruv" onClick={() => handleNavClick('search')} className={`p-3 rounded-lg ${activeTab === 'search' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100'}`}>
            <Search className={`w-5 h-5 ${activeTab === 'search' ? 'stroke-[2.5]' : 'stroke-[1.75]'}`} />
          </button>

          <button title="Market" onClick={() => handleNavClick('market')} className={`p-3 rounded-lg ${activeTab === 'market' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100'}`}>
            <Tag className={`w-5 h-5 ${activeTab === 'market' ? 'stroke-[2.5]' : 'stroke-[1.75]'}`} />
          </button>

          <button title="E'lon berish" aria-label="E'lon berish" onClick={() => setCreateModalOpen(true)} className="p-3 rounded-lg text-[#E53935] hover:bg-red-50">
            <PlusSquare className="w-5 h-5 stroke-[2.25]" />
          </button>

          <button title="Profil" onClick={() => handleNavClick('profile')} className={`p-3 rounded-lg ${activeTab === 'profile' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100'}`}>
            <User className={`w-5 h-5 ${activeTab === 'profile' ? 'stroke-[2.5]' : 'stroke-[1.75]'}`} />
          </button>

          {isAdminUser && (
            <button
              title="Admin Panel"
              onClick={() => handleNavClick('admin')}
              className={`p-3 rounded-lg ${activeTab === 'admin' ? 'bg-[#E53935] text-white shadow-lg' : 'text-[#E53935] hover:bg-red-50'}`}
            >
              <ShieldCheck className={`w-5 h-5 ${activeTab === 'admin' ? 'stroke-[2.5]' : 'stroke-[2]'}`} />
            </button>
          )}
        </nav>
      </div>
    </aside>
  );
};