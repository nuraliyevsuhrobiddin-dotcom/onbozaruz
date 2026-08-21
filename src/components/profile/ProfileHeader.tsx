import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CheckCircle2,
  MapPin,
  Camera,
  Plus,
  EllipsisVertical,
  Settings,
  Building2,
  ExternalLink,
  ShoppingBag,
  Share2,
  Edit3,
  Package,
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
    businessName?: string;
    role?: 'seller' | 'buyer' | 'business' | 'business_buyer' | 'supplier' | 'manufacturer' | 'importer' | 'distributor';
    website?: string;
    telegram?: string;
  };
  postsCount: number;
  productsCount: number;
  savedCount: number;
  viewsCount?: number;
  ordersCount: number;
  isProfileMenuOpen: boolean;
  setProfileMenuOpen: React.Dispatch<React.SetStateAction<boolean>>;
  profileMenuRef: React.RefObject<HTMLDivElement | null>;
  onNavigateSubView: (subView: 'edit-profile' | 'orders' | 'settings') => void;
  onSelectGridTab?: (tab: 'posts' | 'products' | 'saved') => void;
  onOpenCreateModal: () => void;
  onShareProfile: () => void;
}

export const ProfileHeader: React.FC<ProfileHeaderProps> = ({
  currentUser,
  profileData,
  postsCount,
  productsCount,
  savedCount,
  viewsCount = 0,
  ordersCount,
  isProfileMenuOpen,
  setProfileMenuOpen,
  profileMenuRef,
  onNavigateSubView,
  onSelectGridTab,
  onOpenCreateModal,
  onShareProfile,
}) => {
  const [avatarLoadError, setAvatarLoadError] = useState(false);
  const [coverLoadError, setCoverLoadError] = useState(false);

  const isBusiness = profileData.role === 'business' || Boolean(profileData.businessName);

  return (
    <div className="bg-white rounded-[26px] border border-slate-200/80 shadow-sm transition-all">
      {/* Cover Image */}
      <div className="h-28 sm:h-36 rounded-t-[26px] bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 relative overflow-hidden">
        {!coverLoadError && profileData.cover ? (
          <img
            src={profileData.cover}
            alt="Cover"
            onError={() => setCoverLoadError(true)}
            className="w-full h-full object-cover opacity-90"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-[#1e293b] via-[#334155] to-[#0f172a]" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/20" />

        {/* Cover Change Button */}
        <button
          type="button"
          onClick={() => onNavigateSubView('edit-profile')}
          className="absolute right-3 top-3 rounded-full bg-black/50 hover:bg-black/75 px-3 py-1.5 text-[11px] font-black text-white backdrop-blur-md border border-white/20 shadow-md transition-all flex items-center gap-1.5 cursor-pointer"
        >
          <Camera className="w-3.5 h-3.5 text-white/80" />
          <span className="hidden sm:inline">Muqova</span>
        </button>
      </div>

      {/* Main Profile Info Container */}
      <div className="px-4 pb-4 pt-0 relative">
        {/* Row with Avatar & Stats */}
        <div className="flex items-end justify-between -mt-10 sm:-mt-12 mb-3">
          {/* Avatar */}
          <div className="relative shrink-0">
            <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full border-4 border-white overflow-hidden shadow-xl bg-slate-100 flex items-center justify-center">
              {!avatarLoadError && profileData.avatar ? (
                <img
                  src={profileData.avatar}
                  alt={profileData.name || 'User'}
                  onError={() => setAvatarLoadError(true)}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-[#D84315] via-[#D32F2F] to-[#B71C1C] text-white font-black text-2xl sm:text-3xl flex items-center justify-center">
                  {(profileData.name || currentUser?.name || 'U').charAt(0).toUpperCase()}
                </div>
              )}
            </div>
            <button
              type="button"
              onClick={() => onNavigateSubView('edit-profile')}
              className="absolute bottom-0 right-0 p-1.5 sm:p-2 rounded-full bg-[#D84315] text-white border-2 border-white shadow-md hover:bg-[#BF360C] transition-colors cursor-pointer"
              title="Rasmni almashtirish"
            >
              <Camera className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Stats Row (E'lonlar, Mahsulotlar, Saqlanganlar, Ko'rishlar) */}
          <div className="flex-1 flex justify-around items-center pl-3 sm:pl-6 max-w-sm text-center">
            <button
              type="button"
              onClick={() => onSelectGridTab?.('posts')}
              className="rounded-xl px-1.5 py-1 -my-1 transition-colors hover:bg-slate-50 cursor-pointer"
            >
              <span className="font-black text-sm sm:text-base text-[#111827] block leading-tight">
                {postsCount}
              </span>
              <span className="text-[10px] sm:text-[11px] font-bold text-slate-400">E'lonlar</span>
            </button>
            <button
              type="button"
              onClick={() => onSelectGridTab?.('products')}
              className="rounded-xl px-1.5 py-1 -my-1 transition-colors hover:bg-slate-50 cursor-pointer"
            >
              <span className="font-black text-sm sm:text-base text-[#111827] block leading-tight">
                {productsCount}
              </span>
              <span className="text-[10px] sm:text-[11px] font-bold text-slate-400">Market</span>
            </button>
            <button
              type="button"
              onClick={() => onSelectGridTab?.('saved')}
              className="rounded-xl px-1.5 py-1 -my-1 transition-colors hover:bg-slate-50 cursor-pointer"
            >
              <span className="font-black text-sm sm:text-base text-[#111827] block leading-tight">
                {savedCount}
              </span>
              <span className="text-[10px] sm:text-[11px] font-bold text-slate-400">Saqlangan</span>
            </button>
            <div className="px-1.5 py-1 -my-1">
              <span className="font-black text-sm sm:text-base text-[#111827] block leading-tight">
                {viewsCount}
              </span>
              <span className="text-[10px] sm:text-[11px] font-bold text-slate-400">Ko'rildi</span>
            </div>
          </div>
        </div>

        {/* User Info Details */}
        <div className="space-y-2">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="font-black text-lg sm:text-xl text-[#111827] truncate max-w-[240px] sm:max-w-none">
                {profileData.name}
              </h2>
              {profileData.verified && (
                <CheckCircle2 className="w-4 h-4 text-blue-500 fill-blue-50 shrink-0" />
              )}
              {isBusiness && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-50 border border-amber-200 text-amber-800 text-[10px] font-black">
                  <Building2 className="w-3 h-3 text-amber-600" />
                  Biznes
                </span>
              )}
            </div>
            <p className="text-xs font-bold text-slate-400">@{profileData.handle || 'user'}</p>
          </div>

          {/* Location & Tags */}
          <div className="flex flex-wrap items-center gap-2 pt-0.5">
            {profileData.location && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 text-[11px] font-bold">
                <MapPin className="w-3 h-3 text-[#D84315]" />
                {profileData.location}
              </span>
            )}
            {profileData.businessName && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 text-[11px] font-bold">
                <ShoppingBag className="w-3 h-3 text-blue-500" />
                {profileData.businessName}
              </span>
            )}
          </div>

          {/* Bio */}
          {profileData.bio && (
            <p className="text-xs text-slate-600 leading-relaxed font-medium pt-0.5 whitespace-pre-line">
              {profileData.bio}
            </p>
          )}

          {/* Social / Website link if present */}
          {profileData.website && (
            <a
              href={profileData.website.startsWith('http') ? profileData.website : `https://${profileData.website}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-[11px] font-bold text-[#D84315] hover:underline pt-0.5"
            >
              <ExternalLink className="w-3 h-3" />
              <span>{profileData.website.replace(/^https?:\/\//, '')}</span>
            </a>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col gap-2 pt-3 sm:flex-row sm:items-center sm:flex-wrap">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onNavigateSubView('edit-profile')}
              className="flex-1 sm:flex-initial sm:min-w-[120px] py-2.5 px-3 rounded-[14px] bg-slate-100 hover:bg-slate-200 text-slate-900 font-extrabold text-xs transition-colors cursor-pointer text-center flex items-center justify-center gap-1.5"
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span>Tahrirlash</span>
            </button>

            <button
              type="button"
              onClick={() => onNavigateSubView('orders')}
              className="flex-1 sm:flex-initial py-2.5 px-3.5 rounded-[14px] bg-slate-100 hover:bg-slate-200 text-slate-900 font-extrabold text-xs transition-colors cursor-pointer text-center flex items-center justify-center gap-1.5"
            >
              <Package className="w-3.5 h-3.5 text-blue-600" />
              <span>Buyurtmalar</span>
              {ordersCount > 0 && (
                <span className="px-1.5 py-0.2 bg-blue-100 text-blue-700 text-[10px] font-black rounded-full">
                  {ordersCount}
                </span>
              )}
            </button>
          </div>

          <div className="flex items-center gap-2">
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={onOpenCreateModal}
              className="flex-1 sm:flex-initial px-3.5 py-2.5 rounded-[14px] bg-[#D84315] hover:bg-[#D32F2F] text-white font-extrabold text-xs shadow-sm transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-4 h-4 stroke-[3]" />
              <span>E'lon berish</span>
            </motion.button>

            <button
              type="button"
              onClick={onShareProfile}
              title="Profilni ulashish"
              className="w-10 h-10 rounded-[14px] bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center transition-colors cursor-pointer shrink-0"
            >
              <Share2 className="w-4 h-4" />
            </button>

            {/* Dropdown Menu Toggle */}
            <div ref={profileMenuRef} className="relative shrink-0">
              <button
                type="button"
                onClick={() => setProfileMenuOpen((prev) => !prev)}
                className="w-10 h-10 rounded-[14px] bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center transition-colors cursor-pointer"
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
                    className="absolute right-0 top-12 z-30 w-56 overflow-hidden rounded-[20px] border border-slate-200 bg-white shadow-2xl p-1.5"
                  >
                    <button
                      type="button"
                      onClick={() => {
                        setProfileMenuOpen(false);
                        onNavigateSubView('settings');
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-[12px] text-left hover:bg-slate-50 transition-colors text-slate-800 text-xs font-extrabold cursor-pointer"
                    >
                      <Settings className="w-4 h-4 text-slate-500" />
                      <span>Sozlamalar</span>
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
