import React from 'react';
import { Home, Search, Building2, PlusSquare, User, ShieldCheck, Heart } from 'lucide-react';
import { useAgroStore, type NavTab } from '../store/useAgroStore';

export const DesktopLeftSidebar: React.FC = () => {
  const { activeTab, setActiveTab, setCreateModalOpen, isAdminUser, setNotificationsOpen, isNotificationsOpen, unreadNotificationsCount } = useAgroStore();
  const links = [
    { tab: 'home' as NavTab, label: 'Asosiy', icon: Home },
    { tab: 'search' as NavTab, label: 'Qidiruv', icon: Search },
    { tab: 'market' as NavTab, label: 'Ulgurji savdo', icon: Building2 },
  ];
  const navClass = (active: boolean) => `desktop-nav-item ${active ? 'bg-slate-100 font-bold text-slate-950' : 'text-slate-700 hover:bg-slate-50'}`;

  return (
    <aside className="desktop-navigation hidden lg:flex fixed inset-y-0 left-0 z-30 flex-col border-r border-slate-200 bg-white px-3 py-7 select-none">
      <button type="button" onClick={() => setActiveTab('home')} aria-label="MollBazar — Asosiy" className="flex min-h-12 items-center gap-3 px-2 mb-9 rounded-lg">
        <img src="/logo.png" alt="" className="h-9 w-9 shrink-0 rounded-xl object-cover" />
        <span className="desktop-nav-label text-xl font-extrabold tracking-tight">MollBazar<span className="text-[#D84315]">.</span></span>
      </button>
      <nav aria-label="Asosiy navigatsiya" className="flex flex-col gap-2">
        {links.map(({ tab, label, icon: Icon }) => (
          <button key={tab} type="button" title={label} aria-label={label} aria-current={activeTab === tab ? 'page' : undefined} onClick={() => setActiveTab(tab)} className={navClass(activeTab === tab)}>
            <Icon className="h-6 w-6 shrink-0" strokeWidth={activeTab === tab ? 2.25 : 1.75} /><span className="desktop-nav-label">{label}</span>
          </button>
        ))}
        <button type="button" title="Bildirishnomalar" aria-label={`Bildirishnomalar${unreadNotificationsCount ? `, ${unreadNotificationsCount} ta o'qilmagan` : ''}`} aria-expanded={isNotificationsOpen} onClick={() => setNotificationsOpen(true)} className={navClass(isNotificationsOpen)}>
          <span className="relative shrink-0"><Heart className="h-6 w-6" strokeWidth={1.75} />{unreadNotificationsCount > 0 && <span className="absolute -right-2 -top-2 min-w-4 rounded-full bg-[#D84315] px-1 text-center text-[10px] font-bold text-white">{unreadNotificationsCount > 9 ? '9+' : unreadNotificationsCount}</span>}</span>
          <span className="desktop-nav-label">Bildirishnomalar</span>
        </button>
        <button type="button" title="E'lon berish" aria-label="E'lon berish" onClick={() => setCreateModalOpen(true)} className="desktop-nav-item text-[#D84315] hover:bg-orange-50 font-semibold"><PlusSquare className="h-6 w-6 shrink-0" strokeWidth={1.75} /><span className="desktop-nav-label">E'lon berish</span></button>
        <button type="button" title="Profil" aria-label="Profil" aria-current={activeTab === 'profile' ? 'page' : undefined} onClick={() => setActiveTab('profile')} className={navClass(activeTab === 'profile')}><User className="h-6 w-6 shrink-0" strokeWidth={1.75} /><span className="desktop-nav-label">Profil</span></button>
        {isAdminUser && <button type="button" title="Admin panel" aria-label="Admin panel" aria-current={activeTab === 'admin' ? 'page' : undefined} onClick={() => setActiveTab('admin')} className={navClass(activeTab === 'admin')}><ShieldCheck className="h-6 w-6 shrink-0" /><span className="desktop-nav-label">Admin panel</span></button>}
      </nav>
      <p className="desktop-nav-label mt-auto px-3 pt-8 text-xs leading-5 text-slate-500">O'z bozoringiz.<br />Har kuni yoningizda.</p>
    </aside>
  );
};
