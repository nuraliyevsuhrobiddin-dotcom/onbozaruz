import React from 'react';
import { BottomSheet } from './ui/BottomSheet';
import { useAgroStore } from '../store/useAgroStore';
import { Bell, Heart, Bookmark, PackageCheck, MessageCircle, CheckCircle2 } from 'lucide-react';

export const NotificationsDrawerModal: React.FC = () => {
  const {
    isNotificationsOpen,
    setNotificationsOpen,
    posts,
    orders,
    likedPostIds,
    savedPostIds,
    setProductDetail,
  } = useAgroStore();

  const latestPosts = posts.slice(0, 3).map((post) => ({
    id: `post-${post.id}`,
    icon: MessageCircle,
    title: post.sellerName,
    text: `Yangi e'lon: ${post.title}`,
    time: post.date,
    tone: 'text-blue-600 bg-blue-50',
    onClick: () => setProductDetail(post),
  }));

  const orderItems = orders.slice(0, 2).map((order) => ({
    id: `order-${order.id}`,
    icon: PackageCheck,
    title: order.status,
    text: `${order.productName} - ${order.totalPrice}`,
    time: order.date,
    tone: 'text-emerald-600 bg-emerald-50',
    onClick: undefined,
  }));

  const activityItems = [
    likedPostIds.length > 0 && {
      id: 'likes',
      icon: Heart,
      title: 'Layklar',
      text: `${likedPostIds.length} ta e'lonni yoqtirgansiz`,
      time: 'Hozir',
      tone: 'text-[#E53935] bg-red-50',
      onClick: undefined,
    },
    savedPostIds.length > 0 && {
      id: 'saved',
      icon: Bookmark,
      title: 'Saqlanganlar',
      text: `${savedPostIds.length} ta e'lon saqlangan`,
      time: 'Hozir',
      tone: 'text-amber-600 bg-amber-50',
      onClick: undefined,
    },
  ].filter(Boolean) as Array<{
    id: string;
    icon: typeof Bell;
    title: string;
    text: string;
    time: string;
    tone: string;
    onClick?: () => void;
  }>;

  const notifications = [...activityItems, ...orderItems, ...latestPosts];

  return (
    <BottomSheet
      isOpen={isNotificationsOpen}
      onClose={() => setNotificationsOpen(false)}
      title="Bildirishnomalar"
    >
      <div className="space-y-3 py-2 select-none">
        <div className="flex items-center justify-between rounded-[18px] bg-slate-50 px-3 py-2 border border-slate-100">
          <div className="flex items-center gap-2">
            <span className="w-9 h-9 rounded-full bg-red-50 text-[#E53935] flex items-center justify-center">
              <Bell className="w-4 h-4" />
            </span>
            <div>
              <h3 className="font-black text-sm text-[#111827]">Faol bildirishnomalar</h3>
              <p className="text-[11px] text-slate-400">{notifications.length} ta yangilik</p>
            </div>
          </div>
          <CheckCircle2 className="w-4 h-4 text-emerald-500" />
        </div>

        <div className="space-y-2 max-h-[360px] overflow-y-auto no-scrollbar">
          {notifications.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  item.onClick?.();
                  if (item.onClick) setNotificationsOpen(false);
                }}
                className="w-full flex items-start gap-3 rounded-[18px] border border-slate-100 bg-white p-3 text-left shadow-sm hover:border-slate-200 transition-colors"
              >
                <span className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${item.tone}`}>
                  <Icon className="w-4 h-4" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-xs font-black text-[#111827] truncate">{item.title}</span>
                  <span className="block text-[11px] text-slate-500 line-clamp-2 mt-0.5">{item.text}</span>
                  <span className="block text-[10px] text-slate-400 font-bold mt-1">{item.time}</span>
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </BottomSheet>
  );
};
