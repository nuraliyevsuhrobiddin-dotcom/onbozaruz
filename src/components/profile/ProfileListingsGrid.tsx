import React from 'react';
import { Grid, Bookmark, Edit3, Trash2 } from 'lucide-react';
import { Post, Product } from '../../data/mockAgroData';
import { Tabs } from '../ui/Tabs';
import { EmptyState } from '../ui/EmptyState';

interface ProfileListingsGridProps {
  activeGridTab: string;
  gridItems: (Post | Product)[];
  isAdminUser: boolean;
  onTabChange: (tab: string) => void;
  onSelectDetail: (item: Post | Product) => void;
  onEditItem: (item: Post | Product) => void;
  onDeleteItem: (id: string) => void;
  onOpenCreateModal: () => void;
}

export const ProfileListingsGrid: React.FC<ProfileListingsGridProps> = ({
  activeGridTab,
  gridItems,
  isAdminUser,
  onTabChange,
  onSelectDetail,
  onEditItem,
  onDeleteItem,
  onOpenCreateModal,
}) => {
  return (
    <div className="bg-white rounded-[26px] border border-slate-200/80 overflow-hidden shadow-sm">
      <Tabs
        tabs={[
          { id: 'posts', label: "E'lonlarim", icon: <Grid className="w-4 h-4" /> },
          { id: 'saved', label: 'Saqlanganlar', icon: <Bookmark className="w-4 h-4" /> },
        ]}
        activeTab={activeGridTab}
        onChange={onTabChange}
      />

      <div className="grid grid-cols-3 gap-1 p-1.5">
        {gridItems.length > 0 ? (
          gridItems.map((item) => {
            const imageSrc =
              'posterUrl' in item
                ? item.posterUrl || item.mediaUrl
                : 'image' in item
                ? item.image
                : '';
            return (
              <div
                key={item.id}
                onClick={() => onSelectDetail(item)}
                className="relative aspect-square bg-slate-100 overflow-hidden cursor-pointer group rounded-[14px]"
              >
                <img
                  src={imageSrc || '/logo.png'}
                  alt={item.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
                {'status' in item && item.status === 'pending' && <span className="absolute left-1 top-1 rounded-full bg-amber-300 px-1.5 py-0.5 text-[8px] font-black text-amber-950">Kutilmoqda</span>}
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-between p-2 text-white text-[10px] font-extrabold">
                  {activeGridTab === 'posts' && isAdminUser ? (
                    <div className="flex justify-end gap-1">
                      <button
                        type="button"
                        title="Tahrirlash"
                        onClick={(e) => {
                          e.stopPropagation();
                          onEditItem(item);
                        }}
                        className="p-1.5 rounded-full bg-white/20 hover:bg-white/40 backdrop-blur-sm text-white transition-colors"
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
                        className="p-1.5 rounded-full bg-red-500/80 hover:bg-red-600 backdrop-blur-sm text-white transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ) : (
                    <div />
                  )}
                  <span className="line-clamp-2 text-center pb-0.5 text-[11px] font-bold drop-shadow-sm">
                    {item.title}
                  </span>
                </div>
              </div>
            );
          })
        ) : (
          <div className="col-span-3 py-4">
            <EmptyState
              icon="📢"
              title={
                activeGridTab === 'posts'
                  ? "Hozircha sizning e'lonlaringiz yo'q"
                  : "Saqlangan e'lonlar yo'q"
              }
              description={
                activeGridTab === 'posts'
                  ? "Birinchi e'lonni joylashtirish orqali xaridorlarni jalb qiling."
                  : "Saqlangan e'lonlarni bu yerda qayta ko'rishingiz mumkin."
              }
              action={
                activeGridTab === 'posts'
                  ? {
                      label: "E'lon berish",
                      onClick: onOpenCreateModal,
                    }
                  : undefined
              }
            />
          </div>
        )}
      </div>
    </div>
  );
};
