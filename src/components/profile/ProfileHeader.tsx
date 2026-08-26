import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  CheckCircle2,
  MapPin,
  Camera,
  Plus,
  Settings,
  Building2,
  ExternalLink,
  ShoppingBag,
  Edit3,
  Package,
  Store,
  ChevronRight,
  Sparkles,
} from 'lucide-react';
import { AuthUser } from '../../api/authClient';
import { useAgroStore } from '../../store/useAgroStore';

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
  savedCount: number;
  viewsCount?: number;
  ordersCount: number;
  onNavigateSubView: (subView: 'edit-profile' | 'orders' | 'settings') => void;
  onSelectGridTab?: (tab: 'posts' | 'saved') => void;
  onOpenCreateModal: () => void;
}

export const ProfileHeader: React.FC<ProfileHeaderProps> = ({
  currentUser,
  profileData,
  postsCount,
  savedCount,
  viewsCount = 0,
  ordersCount: _ordersCount,
  onNavigateSubView,
  onSelectGridTab,
  onOpenCreateModal,
}) => {
  const {
    supplierProfile,
    businessProfile,
    b2bOrders,
    supplierB2BOrders,
    setActiveTab,
    setB2BRoute,
  } = useAgroStore();

  const [avatarLoadError, setAvatarLoadError] = useState(false);
  const [coverLoadError, setCoverLoadError] = useState(false);

  const isSupplier = Boolean(supplierProfile);
  const isBusiness = Boolean(businessProfile) || profileData.role === 'business' || Boolean(profileData.businessName);
  const totalB2BOrdersCount = b2bOrders.length + (isSupplier ? supplierB2BOrders.length : 0);

  const handleOpenB2BSection = (view: 'dashboard' | 'business' | 'home' | 'contracts' | 'finance') => {
    setActiveTab('market');
    setB2BRoute({ view });
  };

  return (
    <div className="bg-white rounded-[26px] border border-slate-200/80 shadow-sm transition-all relative overflow-hidden">
      {/* Cover Image */}
      <div className="h-28 sm:h-36 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 relative overflow-hidden">
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

        {/* Top Cover Actions */}
        <div className="absolute right-3 top-3 flex items-center gap-1.5 z-10">
          <button
            type="button"
            onClick={() => onNavigateSubView('edit-profile')}
            className="rounded-full bg-black/50 hover:bg-black/75 px-3 py-1.5 text-[11px] font-black text-white backdrop-blur-md border border-white/20 shadow-md transition-all flex items-center gap-1.5 cursor-pointer"
            title="Muqovani almashtirish"
          >
            <Camera className="w-3.5 h-3.5 text-white/80" />
            <span className="text-[11px]">Muqova</span>
          </button>
        </div>
      </div>

      {/* Main Profile Info Container */}
      <div className="px-3.5 sm:px-4 pb-4 pt-0 relative space-y-3">
        {/* Row with Avatar & Stats */}
        <div className="flex items-end justify-between -mt-10 sm:-mt-12">
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

          {/* Stats Row (E'lonlar, Saqlanganlar, Ko'rishlar) */}
          <div className="flex-1 flex justify-around items-center pl-2 sm:pl-8 text-center">
            <button
              type="button"
              onClick={() => onSelectGridTab?.('posts')}
              className="rounded-xl px-2 py-1 -my-1 transition-colors hover:bg-slate-50 cursor-pointer"
            >
              <span className="font-black text-sm sm:text-base text-[#111827] block leading-tight">
                {postsCount}
              </span>
              <span className="text-[10px] sm:text-[11px] font-bold text-slate-400">E'lonlar</span>
            </button>
            <button
              type="button"
              onClick={() => onSelectGridTab?.('saved')}
              className="rounded-xl px-2 py-1 -my-1 transition-colors hover:bg-slate-50 cursor-pointer"
            >
              <span className="font-black text-sm sm:text-base text-[#111827] block leading-tight">
                {savedCount}
              </span>
              <span className="text-[10px] sm:text-[11px] font-bold text-slate-400">Saqlangan</span>
            </button>
            <div className="px-2 py-1 -my-1">
              <span className="font-black text-sm sm:text-base text-[#111827] block leading-tight">
                {viewsCount}
              </span>
              <span className="text-[10px] sm:text-[11px] font-bold text-slate-400">Ko'rildi</span>
            </div>
          </div>
        </div>

        {/* User Info Details */}
        <div className="space-y-1.5">
          <div>
            <div className="flex items-center gap-1.5 flex-wrap">
              <h2 className="font-black text-lg sm:text-xl text-[#111827] truncate max-w-[240px] sm:max-w-none">
                {profileData.name}
              </h2>
              {profileData.verified && (
                <CheckCircle2 className="w-4 h-4 text-blue-500 fill-blue-50 shrink-0" />
              )}
              {isSupplier && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-[10px] font-black">
                  <Building2 className="w-3 h-3 text-emerald-600" />
                  B2B Ta'minotchi
                </span>
              )}
              {!isSupplier && isBusiness && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-blue-50 border border-blue-200 text-blue-800 text-[10px] font-black">
                  <Store className="w-3 h-3 text-blue-600" />
                  B2B Do'kon
                </span>
              )}
            </div>
            <p className="text-xs font-bold text-slate-400">@{profileData.handle || 'user'}</p>
          </div>

          {/* Location & Business info */}
          <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
            {profileData.location && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 text-[11px] font-bold">
                <MapPin className="w-3 h-3 text-[#D84315]" />
                {profileData.location}
              </span>
            )}
            {(supplierProfile?.companyName || businessProfile?.storeName || profileData.businessName) && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 text-[11px] font-bold">
                <ShoppingBag className="w-3 h-3 text-slate-500" />
                {supplierProfile?.companyName || businessProfile?.storeName || profileData.businessName}
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

        {/* ── B2B Wholesale Status & Cabinet Quick Access Card ── */}
        <div className="pt-1">
          {isSupplier ? (
            <div
              onClick={() => handleOpenB2BSection('dashboard')}
              className="p-3 rounded-2xl bg-gradient-to-r from-emerald-500/10 via-teal-500/10 to-blue-500/10 border border-emerald-200/80 flex items-center justify-between gap-3 cursor-pointer hover:border-emerald-300 transition-all group"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                  <Building2 className="w-4.5 h-4.5" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="font-black text-xs text-slate-900">B2B Ta'minotchi Kabineti</span>
                    <span className="px-1.5 py-0.2 bg-emerald-100 text-emerald-800 text-[9px] font-black rounded-md">Faol</span>
                  </div>
                  <p className="text-[11px] text-slate-500 font-semibold truncate">
                    Ulgurji mahsulotlar, tushgan buyurtmalar va moliya
                  </p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-emerald-600 shrink-0 group-hover:translate-x-0.5 transition-transform" />
            </div>
          ) : isBusiness ? (
            <div
              onClick={() => handleOpenB2BSection('business')}
              className="p-3 rounded-2xl bg-gradient-to-r from-blue-500/10 via-indigo-500/10 to-violet-500/10 border border-blue-200/80 flex items-center justify-between gap-3 cursor-pointer hover:border-blue-300 transition-all group"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                  <Store className="w-4.5 h-4.5" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="font-black text-xs text-slate-900">B2B Do'kon Kabineti</span>
                    <span className="px-1.5 py-0.2 bg-blue-100 text-blue-800 text-[9px] font-black rounded-md">Ulgurji xaridor</span>
                  </div>
                  <p className="text-[11px] text-slate-500 font-semibold truncate">
                    To'g'ridan-to'g'ri ishlab chiqaruvchilardan arzon narxda xaridlar
                  </p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-blue-600 shrink-0 group-hover:translate-x-0.5 transition-transform" />
            </div>
          ) : (
            <div
              onClick={() => handleOpenB2BSection('business')}
              className="p-3 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-center justify-between gap-3 cursor-pointer hover:bg-orange-50/50 hover:border-orange-200 transition-all group"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#D84315] to-[#BF360C] text-white flex items-center justify-center shrink-0 shadow-xs">
                  <Sparkles className="w-4.5 h-4.5" />
                </div>
                <div className="min-w-0">
                  <span className="font-black text-xs text-slate-900 block">B2B Ulgurji Savdoga qo'shiling</span>
                  <p className="text-[11px] text-slate-500 font-semibold truncate">
                    Do'kon yoki Ta'minotchi sifatida ro'yxatdan o'ting
                  </p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-[#D84315] shrink-0 group-hover:translate-x-0.5 transition-transform" />
            </div>
          )}
        </div>

        {/* Action Buttons: Clean Symmetrical 2x2 Grid Layout */}
        <div className="pt-2 space-y-2">
          {/* Main Row: Tahrirlash & E'lon Berish */}
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => onNavigateSubView('edit-profile')}
              className="py-2.5 px-3 rounded-[16px] bg-slate-100 hover:bg-slate-200 text-slate-900 font-extrabold text-xs transition-colors cursor-pointer text-center flex items-center justify-center gap-1.5 active:scale-[0.98]"
            >
              <Edit3 className="w-3.5 h-3.5 text-slate-600" />
              <span>Tahrirlash</span>
            </button>

            <motion.button
              whileTap={{ scale: 0.98 }}
              onClick={onOpenCreateModal}
              className="py-2.5 px-4 rounded-[16px] bg-gradient-to-r from-[#D84315] to-[#BF360C] hover:brightness-110 text-white font-extrabold text-xs shadow-sm transition-all flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-4 h-4 stroke-[3]" />
              <span>E'lon berish</span>
            </motion.button>
          </div>

          {/* Secondary Row: Buyurtmalar & Sozlamalar */}
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => onNavigateSubView('orders')}
              className="py-2.5 px-3 rounded-[16px] bg-slate-50 hover:bg-slate-100 border border-slate-200/80 text-slate-800 font-extrabold text-xs transition-colors cursor-pointer flex items-center justify-center gap-1.5"
              title="B2B Buyurtmalar"
            >
              <Package className="w-3.5 h-3.5 text-blue-600 shrink-0" />
              <span className="truncate">Buyurtmalar</span>
              {totalB2BOrdersCount > 0 && (
                <span className="px-1.5 py-0.2 bg-blue-100 text-blue-700 text-[10px] font-black rounded-full">
                  {totalB2BOrdersCount}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => onNavigateSubView('settings')}
              className="py-2.5 px-3 rounded-[16px] bg-slate-50 hover:bg-slate-100 border border-slate-200/80 text-slate-800 font-extrabold text-xs transition-colors cursor-pointer flex items-center justify-center gap-1.5"
              title="Sozlamalar"
            >
              <Settings className="w-3.5 h-3.5 text-slate-600 shrink-0" />
              <span className="truncate">Sozlamalar</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

