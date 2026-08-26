import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Grid,
  Bookmark,
  Edit3,
  Trash2,
  Play,
  Plus,
  PackageOpen,
  Clock,
  LayoutGrid,
  ListFilter,
  CheckCircle2,
  AlertCircle,
  Eye,
} from 'lucide-react';
import { Post } from '../../data/mockAgroData';

export type ProfileTabType = 'posts' | 'saved';

function formatDaysRemaining(expiresAt: string): string {
  const days = Math.ceil((new Date(expiresAt).getTime() - Date.now()) / 86400000);
  if (days <= 0) return 'Bugun tugaydi';
  if (days === 1) return '1 kun qoldi';
  return `${days} kun qoldi`;
}

interface ProfileListingsGridProps {
  activeGridTab: ProfileTabType;
  posts: Post[];
  savedPosts: Post[];
  isAdminUser: boolean;
  onTabChange: (tab: ProfileTabType) => void;
  onSelectPost: (post: Post) => void;
  onEditItem: (item: Post) => void;
  onDeleteItem: (id: string) => void;
  onOpenCreateModal: () => void;
}

export const ProfileListingsGrid: React.FC<ProfileListingsGridProps> = ({
  activeGridTab,
  posts,
  savedPosts,
  isAdminUser: _isAdminUser,
  onTabChange,
  onSelectPost,
  onEditItem,
  onDeleteItem,
  onOpenCreateModal,
}) => {
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'detailed'>('grid');

  const tabs = [
    { id: 'posts' as ProfileTabType, label: "Mening e'lonlarim", icon: Grid, count: posts.length },
    { id: 'saved' as ProfileTabType, label: 'Saqlanganlar', icon: Bookmark, count: savedPosts.length },
  ];

  // Extract unique categories from current items
  const activeItems = activeGridTab === 'posts' ? posts : savedPosts;

  const availableCategories = useMemo(() => {
    const categoriesSet = new Set<string>();
    activeItems.forEach((item) => {
      if (item.category) categoriesSet.add(item.category);
    });
    return Array.from(categoriesSet);
  }, [activeItems]);

  // Filter items
  const filteredItems = useMemo(() => {
    return activeItems.filter((item) => {
      if (selectedCategoryFilter === 'all') return true;
      if (selectedCategoryFilter === 'active') return item.status !== 'pending' && item.status !== 'rejected';
      if (selectedCategoryFilter === 'pending') return item.status === 'pending';
      if (selectedCategoryFilter === 'rejected') return item.status === 'rejected';
      if (selectedCategoryFilter === 'video') return item.type === 'video';
      return item.category === selectedCategoryFilter;
    });
  }, [activeItems, selectedCategoryFilter]);

  return (
    <div className="bg-white rounded-[26px] border border-slate-200/80 overflow-hidden shadow-sm">
      {/* Tab Header with Responsive Design */}
      <div className="flex border-b border-slate-100 bg-slate-50/50">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeGridTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => {
                onTabChange(tab.id);
                setSelectedCategoryFilter('all');
              }}
              className={`flex-1 py-3.5 px-3 flex items-center justify-center gap-1.5 sm:gap-2 font-black text-xs transition-all relative cursor-pointer ${
                isActive ? 'text-[#D84315] bg-white' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <Icon className="w-4 h-4 shrink-0" />
              <span className="whitespace-nowrap">{tab.label}</span>
              {tab.count > 0 && (
                <span
                  className={`text-[10px] px-2 py-0.5 rounded-full font-bold transition-colors ${
                    isActive ? 'bg-orange-100 text-[#D84315]' : 'bg-slate-200/80 text-slate-600'
                  }`}
                >
                  {tab.count}
                </span>
              )}
              {isActive && (
                <motion.div
                  layoutId="profile-tab-indicator"
                  className="absolute bottom-0 inset-x-0 h-0.5 bg-[#D84315]"
                />
              )}
            </button>
          );
        })}
      </div>

      {/* Horizontal Scrollable Category & Status Filters */}
      {activeItems.length > 0 && (
        <div className="px-3 pt-3 pb-1 border-b border-slate-100/80 flex items-center justify-between gap-2">
          {/* Scrollable Pills Container */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar scroll-smooth py-1 flex-1">
            <button
              type="button"
              onClick={() => setSelectedCategoryFilter('all')}
              className={`px-3 py-1.5 rounded-full text-xs font-bold shrink-0 transition-all cursor-pointer ${
                selectedCategoryFilter === 'all'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Barchasi ({activeItems.length})
            </button>

            {activeGridTab === 'posts' && (
              <>
                {posts.some((p) => p.status === 'pending') && (
                  <button
                    type="button"
                    onClick={() => setSelectedCategoryFilter('pending')}
                    className={`px-3 py-1.5 rounded-full text-xs font-bold shrink-0 transition-all cursor-pointer flex items-center gap-1 ${
                      selectedCategoryFilter === 'pending'
                        ? 'bg-amber-500 text-white shadow-xs'
                        : 'bg-amber-50 text-amber-800 hover:bg-amber-100'
                    }`}
                  >
                    <Clock className="w-3 h-3" />
                    <span>Kutilmoqda ({posts.filter((p) => p.status === 'pending').length})</span>
                  </button>
                )}

                {posts.some((p) => p.type === 'video') && (
                  <button
                    type="button"
                    onClick={() => setSelectedCategoryFilter('video')}
                    className={`px-3 py-1.5 rounded-full text-xs font-bold shrink-0 transition-all cursor-pointer flex items-center gap-1 ${
                      selectedCategoryFilter === 'video'
                        ? 'bg-purple-600 text-white shadow-xs'
                        : 'bg-purple-50 text-purple-800 hover:bg-purple-100'
                    }`}
                  >
                    <Play className="w-3 h-3" />
                    <span>Videolar ({posts.filter((p) => p.type === 'video').length})</span>
                  </button>
                )}
              </>
            )}

            {/* Dynamic Categories */}
            {availableCategories.map((cat) => {
              const count = activeItems.filter((i) => i.category === cat).length;
              return (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setSelectedCategoryFilter(cat)}
                  className={`px-3 py-1.5 rounded-full text-xs font-bold shrink-0 capitalize transition-all cursor-pointer ${
                    selectedCategoryFilter === cat
                      ? 'bg-[#D84315] text-white shadow-xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {cat} ({count})
                </button>
              );
            })}
          </div>

          {/* Grid / Detailed Toggle */}
          <div className="flex items-center gap-1 shrink-0 pl-1">
            <button
              type="button"
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                viewMode === 'grid' ? 'bg-slate-200 text-slate-900' : 'text-slate-400 hover:text-slate-600'
              }`}
              title="Katak ko'rinishi"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => setViewMode('detailed')}
              className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                viewMode === 'detailed' ? 'bg-slate-200 text-slate-900' : 'text-slate-400 hover:text-slate-600'
              }`}
              title="Ro'yxat ko'rinishi"
            >
              <ListFilter className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Grid / List Content */}
      <div className="p-2">
        {/* Active Items Available */}
        {filteredItems.length > 0 ? (
          viewMode === 'grid' ? (
            /* 3x3 Compact Grid Mode */
            <div className="grid grid-cols-3 gap-1.5">
              {filteredItems.map((item) => {
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

                    {/* Status Badges */}
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

                    {/* Expires At Badge */}
                    {item.expiresAt && (
                      <span className="absolute left-1.5 bottom-1.5 rounded-full bg-black/60 text-white px-1.5 py-0.5 text-[8px] font-black shadow-sm backdrop-blur-sm flex items-center gap-0.5">
                        <Clock className="w-2.5 h-2.5" />
                        {formatDaysRemaining(item.expiresAt)}
                      </span>
                    )}

                    {/* Hover Overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-between p-2 text-white">
                      <div className="flex justify-end gap-1">
                        {activeGridTab === 'posts' && (
                          <>
                            <button
                              type="button"
                              title="Tahrirlash"
                              onClick={(e) => {
                                e.stopPropagation();
                                onEditItem(item);
                              }}
                              className="p-1.5 rounded-lg bg-white/20 hover:bg-white/40 backdrop-blur-md transition-colors"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              title="O'chirish"
                              onClick={(e) => {
                                e.stopPropagation();
                                if (window.confirm("Rostdan ham bu e'lonni o'chirmoqchimisiz?")) {
                                  onDeleteItem(item.id);
                                }
                              }}
                              className="p-1.5 rounded-lg bg-rose-500/80 hover:bg-rose-600 backdrop-blur-md transition-colors"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </>
                        )}
                      </div>

                      <div>
                        <span className="text-[11px] font-black text-emerald-400 block">{item.price}</span>
                        <span className="line-clamp-1 text-[10px] font-bold">{item.title}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            /* Detailed List Mode */
            <div className="space-y-2">
              {filteredItems.map((item) => {
                const imageSrc = item.posterUrl || item.mediaUrl || '/logo.png';
                const isPending = item.status === 'pending';
                const isRejected = item.status === 'rejected';

                return (
                  <div
                    key={item.id}
                    onClick={() => onSelectPost(item)}
                    className="p-2.5 rounded-2xl bg-slate-50 hover:bg-slate-100/80 border border-slate-200/80 transition-all flex items-center justify-between gap-3 cursor-pointer group"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-16 h-16 rounded-xl bg-slate-200 overflow-hidden relative shrink-0">
                        <img
                          src={imageSrc}
                          alt={item.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                        />
                        {item.type === 'video' && (
                          <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                            <Play className="w-4 h-4 text-white fill-white" />
                          </div>
                        )}
                      </div>

                      <div className="min-w-0 space-y-1">
                        <h4 className="font-extrabold text-xs text-slate-900 truncate">
                          {item.title}
                        </h4>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-black text-[#D84315]">{item.price}</span>
                          {item.category && (
                            <span className="px-2 py-0.5 rounded-md bg-slate-200/70 text-slate-700 text-[10px] font-bold capitalize">
                              {item.category}
                            </span>
                          )}
                          {isPending && (
                            <span className="px-2 py-0.5 rounded-md bg-amber-100 text-amber-800 text-[10px] font-black">
                              Kutilmoqda
                            </span>
                          )}
                          {isRejected && (
                            <span className="px-2 py-0.5 rounded-md bg-rose-100 text-rose-800 text-[10px] font-black">
                              Rad etilgan
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {activeGridTab === 'posts' && (
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          title="Tahrirlash"
                          onClick={(e) => {
                            e.stopPropagation();
                            onEditItem(item);
                          }}
                          className="p-2 rounded-xl bg-white hover:bg-slate-200 border border-slate-200 text-slate-700 transition-colors"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          title="O'chirish"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (window.confirm("Rostdan ham bu e'lonni o'chirmoqchimisiz?")) {
                              onDeleteItem(item.id);
                            }
                          }}
                          className="p-2 rounded-xl bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-600 transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )
        ) : (
          /* Empty States */
          <div className="py-12 px-4 text-center space-y-3">
            <div className="w-14 h-14 mx-auto rounded-2xl bg-slate-50 flex items-center justify-center text-slate-400">
              {activeGridTab === 'posts' ? (
                <Grid className="w-7 h-7" />
              ) : (
                <PackageOpen className="w-7 h-7" />
              )}
            </div>
            <div>
              <h4 className="font-black text-sm text-[#111827]">
                {activeGridTab === 'posts'
                  ? selectedCategoryFilter !== 'all'
                    ? "Tanlangan filtr bo'yicha e'lon topilmadi"
                    : "Hali e'lonlaringiz yo'q"
                  : "Saqlangan e'lonlar yo'q"}
              </h4>
              <p className="text-xs text-slate-400 max-w-xs mx-auto mt-1 font-medium">
                {activeGridTab === 'posts'
                  ? selectedCategoryFilter !== 'all'
                    ? "Boshqa filtrlarni tekshirib ko'ring yoki barchasini tanlang."
                    : "Yangi hosil, texnika yoki mahsulotlaringizni OnBozarga joylashtiring."
                  : "Yoqqan e'lonlarni saqlab qo'ying va keyinroq ularga tezda qayting."}
              </p>
            </div>
            {activeGridTab === 'posts' && selectedCategoryFilter === 'all' && (
              <button
                type="button"
                onClick={onOpenCreateModal}
                className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-full bg-[#D84315] hover:bg-[#BF360C] text-white text-xs font-black shadow-md transition-colors cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>E'lon berish</span>
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
