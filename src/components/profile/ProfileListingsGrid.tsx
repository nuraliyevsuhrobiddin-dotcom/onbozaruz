import React from 'react';
import { motion } from 'framer-motion';
import { Grid, Tag, Bookmark, Edit3, Trash2, Play, Plus, PackageOpen, Clock } from 'lucide-react';
import { Post, Product } from '../../data/mockAgroData';

export type ProfileTabType = 'posts' | 'products' | 'saved';

function formatDaysRemaining(expiresAt: string): string {
  const days = Math.ceil((new Date(expiresAt).getTime() - Date.now()) / 86400000);
  if (days <= 0) return 'Bugun tugaydi';
  if (days === 1) return '1 kun qoldi';
  return `${days} kun qoldi`;
}

interface ProfileListingsGridProps {
  activeGridTab: ProfileTabType;
  posts: Post[];
  products: Product[];
  savedPosts: Post[];
  isAdminUser: boolean;
  onTabChange: (tab: ProfileTabType) => void;
  onSelectPost: (post: Post) => void;
  onSelectProduct: (product: Product) => void;
  onEditItem: (item: Post | Product) => void;
  onDeleteItem: (id: string) => void;
  onOpenCreateModal: () => void;
}

export const ProfileListingsGrid: React.FC<ProfileListingsGridProps> = ({
  activeGridTab,
  posts,
  products,
  savedPosts,
  isAdminUser: _isAdminUser,
  onTabChange,
  onSelectPost,
  onSelectProduct,
  onEditItem,
  onDeleteItem,
  onOpenCreateModal,
}) => {
  const tabs = [
    { id: 'posts' as ProfileTabType, label: "E'lonlar", icon: Grid, count: posts.length },
    { id: 'products' as ProfileTabType, label: 'Mahsulotlar', icon: Tag, count: products.length },
    { id: 'saved' as ProfileTabType, label: 'Saqlanganlar', icon: Bookmark, count: savedPosts.length },
  ];

  return (
    <div className="bg-white rounded-[26px] border border-slate-200/80 overflow-hidden shadow-sm">
      {/* Instagram Style Tab Header */}
      <div className="flex border-b border-slate-100">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeGridTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onTabChange(tab.id)}
              className={`flex-1 py-3 px-2 flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-1.5 font-black text-xs transition-colors relative cursor-pointer ${
                isActive ? 'text-[#E53935]' : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              <Icon className="w-4 h-4 shrink-0" />
              <span className="truncate">{tab.label}</span>
              {tab.count > 0 && (
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                  isActive ? 'bg-red-50 text-[#E53935]' : 'bg-slate-100 text-slate-500'
                }`}>
                  {tab.count}
                </span>
              )}
              {isActive && (
                <motion.div layoutId="profile-tab-indicator" className="absolute bottom-0 inset-x-0 h-0.5 bg-[#E53935]" />
              )}
            </button>
          );
        })}
      </div>

      {/* Grid Content */}
      <div className="p-1.5">
        {/* TAB 1: E'LONLAR */}
        {activeGridTab === 'posts' && (
          posts.length > 0 ? (
            <div className="grid grid-cols-3 gap-1">
              {posts.map((item) => {
                const imageSrc = item.posterUrl || item.mediaUrl || '/logo.png';
                const isPending = item.status === 'pending';
                const isRejected = item.status === 'rejected';

                return (
                  <div
                    key={item.id}
                    onClick={() => onSelectPost(item)}
                    className="relative aspect-square bg-slate-100 overflow-hidden cursor-pointer group rounded-[14px]"
                  >
                    <img
                      src={imageSrc}
                      alt={item.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />

                    {/* Status Badge */}
                    {isPending && (
                      <span className="absolute left-1.5 top-1.5 rounded-full bg-amber-400/95 text-amber-950 px-2 py-0.5 text-[8px] font-black shadow-sm backdrop-blur-sm">
                        Kutilmoqda
                      </span>
                    )}
                    {isRejected && (
                      <span className="absolute left-1.5 top-1.5 rounded-full bg-rose-500 text-white px-2 py-0.5 text-[8px] font-black shadow-sm">
                        Rad etilgan
                      </span>
                    )}

                    {/* Video Badge */}
                    {item.type === 'video' && (
                      <span className="absolute right-1.5 top-1.5 rounded-full bg-black/60 text-white p-1 backdrop-blur-sm">
                        <Play className="w-2.5 h-2.5 fill-white" />
                      </span>
                    )}

                    {/* Muddat tugash indikatori */}
                    {item.expiresAt && (
                      <span className="absolute left-1.5 bottom-1.5 rounded-full bg-black/60 text-white px-1.5 py-0.5 text-[8px] font-black shadow-sm backdrop-blur-sm flex items-center gap-0.5">
                        <Clock className="w-2.5 h-2.5" />
                        {formatDaysRemaining(item.expiresAt)}
                      </span>
                    )}

                    {/* Hover Overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-between p-2 text-white">
                      <div className="flex justify-end gap-1">
                        <button
                          type="button"
                          title="Tahrirlash"
                          onClick={(e) => {
                            e.stopPropagation();
                            onEditItem(item);
                          }}
                          className="p-1.5 rounded-full bg-white/20 hover:bg-white/40 backdrop-blur-sm text-white transition-colors cursor-pointer"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          title="O'chirish"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (window.confirm("Rostdan ham ushbu e'lonni o'chirmoqchimisiz?")) {
                              onDeleteItem(item.id);
                            }
                          }}
                          className="p-1.5 rounded-full bg-red-500/80 hover:bg-red-600 backdrop-blur-sm text-white transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <div>
                        <span className="text-[11px] font-black text-[#22C55E] block leading-none">
                          {item.price}
                        </span>
                        <span className="line-clamp-1 text-[10px] font-bold text-white/90 drop-shadow-sm mt-0.5">
                          {item.title}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="py-12 px-4 text-center space-y-3">
              <div className="w-14 h-14 mx-auto rounded-2xl bg-slate-50 flex items-center justify-center text-slate-400">
                <Grid className="w-7 h-7" />
              </div>
              <div>
                <h4 className="font-black text-sm text-[#111827]">Hali e'lonlaringiz yo'q</h4>
                <p className="text-xs text-slate-400 max-w-xs mx-auto mt-1 font-medium">
                  Yangi hosil, texnika yoki mahsulotlaringizni OnBozarga joylashtiring.
                </p>
              </div>
              <button
                type="button"
                onClick={onOpenCreateModal}
                className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-full bg-[#E53935] hover:bg-[#C62828] text-white text-xs font-black shadow-md transition-colors cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>E'lon berish</span>
              </button>
            </div>
          )
        )}

        {/* TAB 2: MAHSULOTLAR */}
        {activeGridTab === 'products' && (
          products.length > 0 ? (
            <div className="grid grid-cols-3 gap-1">
              {products.map((item) => {
                const imageSrc = item.images?.[0] || item.image || '/logo.png';
                return (
                  <div
                    key={item.id}
                    onClick={() => onSelectProduct(item)}
                    className="relative aspect-square bg-slate-100 overflow-hidden cursor-pointer group rounded-[14px]"
                  >
                    <img
                      src={imageSrc}
                      alt={item.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent flex flex-col justify-end p-2 text-white">
                      <span className="text-[11px] font-black text-emerald-400">{item.price}</span>
                      <span className="line-clamp-1 text-[10px] font-bold">{item.title}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="py-12 px-4 text-center space-y-3">
              <div className="w-14 h-14 mx-auto rounded-2xl bg-slate-50 flex items-center justify-center text-slate-400">
                <Tag className="w-7 h-7" />
              </div>
              <div>
                <h4 className="font-black text-sm text-[#111827]">Hali mahsulotlar qo'shilmagan</h4>
                <p className="text-xs text-slate-400 max-w-xs mx-auto mt-1 font-medium">
                  OnBozar Marketiga o'z tovarlaringiz va ulgurji mahsulotlaringizni kiriting.
                </p>
              </div>
              <button
                type="button"
                onClick={onOpenCreateModal}
                className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-full bg-[#E53935] hover:bg-[#C62828] text-white text-xs font-black shadow-md transition-colors cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Mahsulot qo'shish</span>
              </button>
            </div>
          )
        )}

        {/* TAB 3: SAQLANGANLAR */}
        {activeGridTab === 'saved' && (
          savedPosts.length > 0 ? (
            <div className="grid grid-cols-3 gap-1">
              {savedPosts.map((item) => {
                const imageSrc = item.posterUrl || item.mediaUrl || '/logo.png';
                return (
                  <div
                    key={item.id}
                    onClick={() => onSelectPost(item)}
                    className="relative aspect-square bg-slate-100 overflow-hidden cursor-pointer group rounded-[14px]"
                  >
                    <img
                      src={imageSrc}
                      alt={item.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    {item.type === 'video' && (
                      <span className="absolute right-1.5 top-1.5 rounded-full bg-black/60 text-white p-1 backdrop-blur-sm">
                        <Play className="w-2.5 h-2.5 fill-white" />
                      </span>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent flex flex-col justify-end p-2 text-white">
                      <span className="text-[11px] font-black text-emerald-400">{item.price}</span>
                      <span className="line-clamp-1 text-[10px] font-bold">{item.title}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="py-12 px-4 text-center space-y-3">
              <div className="w-14 h-14 mx-auto rounded-2xl bg-slate-50 flex items-center justify-center text-slate-400">
                <PackageOpen className="w-7 h-7" />
              </div>
              <div>
                <h4 className="font-black text-sm text-[#111827]">Saqlangan e'lonlar yo'q</h4>
                <p className="text-xs text-slate-400 max-w-xs mx-auto mt-1 font-medium">
                  Yoqqan e'lonlarni saqlab qo'ying va keyinroq ularga tezda qayting.
                </p>
              </div>
            </div>
          )
        )}
      </div>
    </div>
  );
};
