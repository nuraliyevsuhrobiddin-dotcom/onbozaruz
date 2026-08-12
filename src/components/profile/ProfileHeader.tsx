import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CheckCircle2,
  MapPin,
  Camera,
  Plus,
  EllipsisVertical,
  Settings,
  Globe,
  LogOut,
} from 'lucide-react';
import { AuthUser } from '../../api/authClient';

interface ProfileHeaderProps {
  currentUser: AuthUser;
  profileData: {
    name: string;
    handle: string;
    avatar: string;
    cover: string;
    verified: boolean;
    location: string;
    bio: string;
  };
  isAdminUser: boolean;
  ordersCount: number;
  isProfileMenuOpen: boolean;
  setProfileMenuOpen: React.Dispatch<React.SetStateAction<boolean>>;
  profileMenuRef: React.RefObject<HTMLDivElement | null>;
  onNavigateSubView: (subView: 'edit-profile' | 'orders' | 'admin-panel' | 'settings') => void;
  onOpenCreateModal: () => void;
  onLogout: () => void;
}

export const ProfileHeader: React.FC<ProfileHeaderProps> = ({
  currentUser,
  profileData,
  isAdminUser,
  ordersCount,
  isProfileMenuOpen,
  setProfileMenuOpen,
  profileMenuRef,
  onNavigateSubView,
  onOpenCreateModal,
  onLogout,
}) => {
  const [avatarLoadError, setAvatarLoadError] = useState(false);
  const [coverLoadError, setCoverLoadError] = useState(false);

  interface MenuItem {
    id: string;
    label: string;
    icon: React.ElementType;
    badge?: number;
    isSpecial?: boolean;
  }

  const menuItems: MenuItem[] = [
    { id: 'settings', label: 'Sozlamalar', icon: Settings },
    { id: 'lang', label: "Til: O'zbekcha", icon: Globe },
    { id: 'logout', label: 'Chiqish', icon: LogOut, isSpecial: true },
  ];

  return (
    <div className="bg-white rounded-[26px] border border-slate-200/80 shadow-md overflow-hidden transition-all">
      {/* Cover Image */}
      <div className="h-32 sm:h-36 bg-gradient-to-r from-slate-800 to-slate-950 relative overflow-hidden">
        {!coverLoadError && profileData.cover ? (
          <img
            src={profileData.cover}
            alt="Cover"
            onError={() => setCoverLoadError(true)}
            className="w-full h-full object-cover opacity-90"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-[#fff1e8] via-[#f7d7c7] to-[#e54b3f]" aria-label="Standart muqova" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/20" />

        <button
          type="button"
          onClick={() => onNavigateSubView('edit-profile')}
          className="absolute right-3.5 top-3.5 rounded-full bg-black/50 hover:bg-black/75 px-3 py-1.5 text-[11px] font-black text-white backdrop-blur-md border border-white/20 shadow-lg transition-all flex items-center gap-1.5"
        >
          <Camera className="w-3.5 h-3.5 text-white/80" />
          <span className="hidden sm:inline">Muqova</span>
        </button>
      </div>

      {/* Profile Details Container */}
      <div className="px-4 pb-4 pt-0 relative">
        <div className="flex items-end justify-between -mt-10 sm:-mt-12 mb-3">
          {/* Avatar Container */}
          <div className="relative">
            <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full border-4 border-white overflow-hidden shadow-xl bg-white flex items-center justify-center">
              {!avatarLoadError && profileData.avatar ? (
                <img
                  src={profileData.avatar}
                  alt={profileData.name || 'User'}
                  onError={() => setAvatarLoadError(true)}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-[#E53935] via-[#D32F2F] to-[#B71C1C] text-white font-black text-2xl sm:text-3xl flex items-center justify-center">
                  {(profileData.name || currentUser?.name || 'U').charAt(0).toUpperCase()}
                </div>
              )}
            </div>
            <button
              type="button"
              onClick={() => onNavigateSubView('edit-profile')}
              className="absolute bottom-0 right-0 p-1.5 sm:p-2 rounded-full bg-[#E53935] text-white border-2 border-white shadow-md hover:bg-[#C62828] transition-colors"
              title="Rasmni almashtirish"
            >
              <Camera className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Header Action Buttons */}
          <div className="flex items-center gap-2">
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={onOpenCreateModal}
              className="px-3.5 sm:px-4 py-2 sm:py-2.5 rounded-[16px] bg-[#E53935] hover:bg-[#D32F2F] text-white font-black text-xs shadow-md transition-colors flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4 stroke-[3]" />
              <span>E'lon berish</span>
            </motion.button>

            {/* Ellipsis Dropdown Menu */}
            <div ref={profileMenuRef} className="relative">
              <button
                type="button"
                onClick={() => setProfileMenuOpen((prev) => !prev)}
                className="w-9 h-9 sm:w-10 sm:h-10 rounded-[16px] bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center transition-colors border border-slate-200/60"
                aria-label="Profil menyusi"
              >
                <EllipsisVertical className="w-5 h-5" />
              </button>

              <AnimatePresence>
                {isProfileMenuOpen && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: 10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 10 }}
                    className="absolute right-0 top-12 z-30 w-60 sm:w-64 overflow-hidden rounded-[22px] border border-slate-200 bg-white shadow-2xl p-1.5"
                  >
                    {menuItems.map((menu) => {
                      const Icon = menu.icon;
                      return (
                        <button
                          key={menu.id}
                          type="button"
                          onClick={() => {
                            setProfileMenuOpen(false);
                            if (menu.id === 'logout') {
                              onLogout();
                            } else if (
                              menu.id === 'edit-profile' ||
                              menu.id === 'orders' ||
                              menu.id === 'admin-panel' ||
                              menu.id === 'settings'
                            ) {
                              onNavigateSubView(menu.id);
                            }
                          }}
                          className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-[14px] text-left hover:bg-slate-50 transition-colors ${
                            menu.isSpecial ? 'text-[#E53935]' : 'text-slate-800'
                          }`}
                        >
                          <span className="flex items-center gap-2.5 min-w-0">
                            <span
                              className={`w-8 h-8 rounded-[12px] flex shrink-0 items-center justify-center ${
                                menu.isSpecial ? 'bg-red-50 text-[#E53935]' : 'bg-slate-100 text-slate-600'
                              }`}
                            >
                              <Icon className="w-4 h-4" />
                            </span>
                            <span className="truncate text-xs font-extrabold">{menu.label}</span>
                          </span>

                          {menu.badge !== undefined && menu.badge > 0 && (
                            <span className="px-2 py-0.5 bg-[#E53935] text-white text-[10px] font-black rounded-full">
                              {menu.badge}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>

        {/* User Info Header */}
        <div className="space-y-2">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="font-black text-lg sm:text-xl text-[#111827] truncate max-w-[240px] sm:max-w-none">
                {profileData.name}
              </h2>
              {profileData.verified && (
                <CheckCircle2 className="w-4 h-4 text-blue-500 fill-blue-50 shrink-0" />
              )}
            </div>
            <p className="text-xs font-bold text-slate-400">@{profileData.handle}</p>
          </div>

          <div className="flex flex-wrap items-center gap-2 pt-1">
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 text-[11px] font-bold">
              <MapPin className="w-3 h-3 text-[#E53935]" />
              {profileData.location || "O'zbekiston"}
            </span>
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 text-[11px] font-extrabold">
              <CheckCircle2 className="w-3 h-3 text-emerald-500" />
              Tasdiqlangan hamkor
            </span>
          </div>

          {profileData.bio && (
            <p className="text-xs text-slate-600 leading-relaxed font-medium pt-1">
              {profileData.bio}
            </p>
          )}
        </div>
      </div>
    </div>
  );
};
