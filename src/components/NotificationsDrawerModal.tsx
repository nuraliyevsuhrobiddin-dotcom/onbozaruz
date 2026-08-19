import React from 'react';
import { BottomSheet } from './ui/BottomSheet';
import { useAgroStore } from '../store/useAgroStore';
import { Bell, Heart, MessageCircle, PackageCheck, CheckCircle2, XCircle, CheckCheck } from 'lucide-react';
import { Notification, NotificationType } from '../api/types';

const ICON_BY_TYPE: Record<NotificationType, typeof Bell> = {
  comment: MessageCircle,
  like: Heart,
  order_status: PackageCheck,
  post_approved: CheckCircle2,
  post_rejected: XCircle,
  product_approved: CheckCircle2,
  product_rejected: XCircle,
};

const TONE_BY_TYPE: Record<NotificationType, string> = {
  comment: 'text-blue-600 bg-blue-50',
  like: 'text-[#E53935] bg-red-50',
  order_status: 'text-emerald-600 bg-emerald-50',
  post_approved: 'text-emerald-600 bg-emerald-50',
  product_approved: 'text-emerald-600 bg-emerald-50',
  post_rejected: 'text-rose-600 bg-rose-50',
  product_rejected: 'text-rose-600 bg-rose-50',
};

function formatRelativeTime(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1) return 'Hozirgina';
  if (minutes < 60) return `${minutes} daqiqa oldin`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} soat oldin`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} kun oldin`;
  return new Date(iso).toLocaleDateString('uz-UZ');
}

export const NotificationsDrawerModal: React.FC = () => {
  const {
    isNotificationsOpen,
    setNotificationsOpen,
    notifications,
    unreadNotificationsCount,
    markNotificationRead,
    markAllNotificationsRead,
    posts,
    orders,
    setProductDetail,
    setActiveSubView,
  } = useAgroStore();

  const handleSelect = (notification: Notification) => {
    if (!notification.isRead) void markNotificationRead(notification.id);

    if (notification.targetType === 'post' || notification.targetType === 'product') {
      const post = posts.find((p) => p.id === notification.targetId);
      if (post) setProductDetail(post);
    } else if (notification.targetType === 'order') {
      const order = orders.find((o) => o.id === notification.targetId);
      if (order) setActiveSubView('orders');
    }
    setNotificationsOpen(false);
  };

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
              <p className="text-[11px] text-slate-400">
                {unreadNotificationsCount > 0 ? `${unreadNotificationsCount} ta o'qilmagan` : 'Barchasi o\'qilgan'}
              </p>
            </div>
          </div>
          {unreadNotificationsCount > 0 && (
            <button
              type="button"
              onClick={() => void markAllNotificationsRead()}
              title="Barchasini o'qilgan deb belgilash"
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-full bg-white border border-slate-200 text-[10px] font-black text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
            >
              <CheckCheck className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Hammasi o'qilgan</span>
            </button>
          )}
        </div>

        {notifications.length === 0 ? (
          <div className="py-10 px-4 text-center space-y-2">
            <div className="w-14 h-14 mx-auto rounded-2xl bg-slate-50 flex items-center justify-center text-slate-400">
              <Bell className="w-7 h-7" />
            </div>
            <h4 className="font-black text-sm text-[#111827]">Hozircha bildirishnoma yo'q</h4>
            <p className="text-xs text-slate-400 max-w-xs mx-auto font-medium">
              Izoh, layk, buyurtma va tasdiqlash xabarlari shu yerda ko'rinadi.
            </p>
          </div>
        ) : (
          <div className="space-y-2 max-h-[360px] overflow-y-auto no-scrollbar">
            {notifications.map((notification) => {
              const Icon = ICON_BY_TYPE[notification.type] || Bell;
              const tone = TONE_BY_TYPE[notification.type] || 'text-slate-600 bg-slate-100';
              return (
                <button
                  key={notification.id}
                  type="button"
                  onClick={() => handleSelect(notification)}
                  className={`relative w-full flex items-start gap-3 rounded-[18px] border p-3 text-left shadow-sm transition-colors cursor-pointer ${
                    notification.isRead
                      ? 'border-slate-100 bg-white hover:border-slate-200'
                      : 'border-red-100 bg-red-50/40 hover:border-red-200'
                  }`}
                >
                  <span className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${tone}`}>
                    <Icon className="w-4 h-4" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-xs font-black text-[#111827] truncate">{notification.title}</span>
                    {notification.body && (
                      <span className="block text-[11px] text-slate-500 line-clamp-2 mt-0.5">{notification.body}</span>
                    )}
                    <span className="block text-[10px] text-slate-400 font-bold mt-1">
                      {formatRelativeTime(notification.createdAt)}
                    </span>
                  </span>
                  {!notification.isRead && (
                    <span className="absolute right-3 top-3 w-2 h-2 rounded-full bg-[#E53935]" />
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </BottomSheet>
  );
};
