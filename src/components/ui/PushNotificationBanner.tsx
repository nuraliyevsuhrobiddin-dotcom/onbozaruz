import React, { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence, PanInfo } from 'framer-motion';
import {
  Bell,
  Heart,
  MessageCircle,
  PackageCheck,
  CheckCircle2,
  XCircle,
  Building2,
  Truck,
  X,
  ChevronRight,
} from 'lucide-react';
import { Notification, NotificationType } from '../../api/types';
import { useAgroStore } from '../../store/useAgroStore';

const ICON_MAP: Record<NotificationType, React.ElementType> = {
  comment: MessageCircle,
  like: Heart,
  order_status: PackageCheck,
  post_approved: CheckCircle2,
  post_rejected: XCircle,
  product_approved: CheckCircle2,
  product_rejected: XCircle,
  supplier_approved: Building2,
  supplier_rejected: XCircle,
  supplier_suspended: XCircle,
  b2b_product_approved: CheckCircle2,
  b2b_product_rejected: XCircle,
  b2b_new_order: Truck,
  b2b_order_status: Truck,
};

const COLOR_MAP: Record<NotificationType, { bg: string; text: string; ring: string }> = {
  comment: { bg: 'bg-blue-500', text: 'text-white', ring: 'ring-blue-100' },
  like: { bg: 'bg-[#D84315]', text: 'text-white', ring: 'ring-orange-100' },
  order_status: { bg: 'bg-emerald-500', text: 'text-white', ring: 'ring-emerald-100' },
  post_approved: { bg: 'bg-emerald-500', text: 'text-white', ring: 'ring-emerald-100' },
  product_approved: { bg: 'bg-emerald-500', text: 'text-white', ring: 'ring-emerald-100' },
  post_rejected: { bg: 'bg-rose-500', text: 'text-white', ring: 'ring-rose-100' },
  product_rejected: { bg: 'bg-rose-500', text: 'text-white', ring: 'ring-rose-100' },
  supplier_approved: { bg: 'bg-emerald-500', text: 'text-white', ring: 'ring-emerald-100' },
  supplier_rejected: { bg: 'bg-rose-500', text: 'text-white', ring: 'ring-rose-100' },
  supplier_suspended: { bg: 'bg-rose-500', text: 'text-white', ring: 'ring-rose-100' },
  b2b_product_approved: { bg: 'bg-emerald-500', text: 'text-white', ring: 'ring-emerald-100' },
  b2b_product_rejected: { bg: 'bg-rose-500', text: 'text-white', ring: 'ring-rose-100' },
  b2b_new_order: { bg: 'bg-blue-600', text: 'text-white', ring: 'ring-blue-100' },
  b2b_order_status: { bg: 'bg-emerald-600', text: 'text-white', ring: 'ring-emerald-100' },
};

export const PushNotificationBanner: React.FC = () => {
  const {
    pushNotification,
    clearPushNotification,
    posts,
    orders,
    setProductDetail,
    setActiveSubView,
    setActiveTab,
    setB2BRoute,
    setNotificationsOpen,
    markNotificationRead,
  } = useAgroStore();

  const [activeItem, setActiveItem] = useState<Notification | null>(null);
  const [isHovered, setIsHovered] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (pushNotification) {
      setActiveItem(pushNotification);
    }
  }, [pushNotification]);

  // Auto-dismiss countdown (5.5 seconds)
  useEffect(() => {
    if (!activeItem || isHovered) return;

    timerRef.current = setTimeout(() => {
      handleClose();
    }, 5500);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [activeItem, isHovered]);

  const handleClose = () => {
    setActiveItem(null);
    clearPushNotification();
  };

  const handleClick = () => {
    if (!activeItem) return;
    void markNotificationRead(activeItem.id);

    if (activeItem.targetType === 'post' || activeItem.targetType === 'product') {
      const post = posts.find((p) => p.id === activeItem.targetId);
      if (post) setProductDetail(post);
      else setNotificationsOpen(true);
    } else if (activeItem.targetType === 'order') {
      const order = orders.find((o) => o.id === activeItem.targetId);
      if (order) setActiveSubView('orders');
      else setNotificationsOpen(true);
    } else if (activeItem.targetType === 'b2b_order' && activeItem.targetId) {
      setActiveTab('market');
      setB2BRoute({ view: 'order', id: activeItem.targetId });
    } else if (activeItem.targetType === 'supplier_profile') {
      setActiveTab('market');
      setB2BRoute({ view: 'dashboard' });
    } else if (activeItem.targetType === 'b2b_product' && activeItem.targetId) {
      setActiveTab('market');
      setB2BRoute({ view: 'product', id: activeItem.targetId });
    } else {
      setNotificationsOpen(true);
    }

    handleClose();
  };

  const handleDragEnd = (_: unknown, info: PanInfo) => {
    // Swipe up dismisses the SMS banner
    if (info.offset.y < -25 || info.velocity.y < -200) {
      handleClose();
    }
  };

  if (!activeItem) return null;

  const IconComponent = ICON_MAP[activeItem.type] || Bell;
  const colors = COLOR_MAP[activeItem.type] || { bg: 'bg-[#D84315]', text: 'text-white', ring: 'ring-orange-100' };

  return (
    <AnimatePresence>
      {activeItem && (
        <aside
          aria-label="Bildirishnoma"
          className="fixed top-2 sm:top-4 left-0 right-0 z-[9999] pointer-events-none flex justify-center px-3"
        >
          <motion.div
            initial={{ y: -90, opacity: 0, scale: 0.94 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: -80, opacity: 0, scale: 0.94 }}
            transition={{ type: 'spring', damping: 28, stiffness: 420 }}
            drag="y"
            dragConstraints={{ top: -70, bottom: 0 }}
            dragElastic={0.25}
            onDragEnd={handleDragEnd}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            onClick={handleClick}
            className="pointer-events-auto relative w-full max-w-[420px] bg-white/95 dark:bg-slate-900/95 backdrop-blur-2xl border border-slate-200/90 dark:border-slate-800 rounded-[22px] p-3 sm:p-3.5 shadow-[0_16px_45px_rgba(0,0,0,0.16)] select-none cursor-pointer group active:scale-[0.99] transition-transform overflow-hidden"
          >
            {/* Top iOS drag indicator pill */}
            <div className="w-9 h-1 bg-slate-200 dark:bg-slate-700 rounded-full mx-auto -mt-0.5 mb-2 transition-colors group-hover:bg-slate-300" />

            {/* Header row */}
            <div className="flex items-center justify-between gap-2 mb-1.5">
              <div className="flex items-center gap-2 min-w-0">
                <div
                  className={`w-6 h-6 rounded-lg ${colors.bg} ${colors.text} ring-2 ${colors.ring} flex items-center justify-center shrink-0 shadow-xs`}
                >
                  <IconComponent className="w-3.5 h-3.5" />
                </div>
                <span className="font-extrabold text-[12px] tracking-tight text-slate-900 dark:text-white truncate">
                  {activeItem.actorName || "OnBozar"}
                </span>
                <span className="text-[10px] text-slate-400 font-medium shrink-0">• Hozirgina</span>
              </div>

              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleClose();
                }}
                className="w-6 h-6 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 flex items-center justify-center transition-colors shrink-0"
                aria-label="Yopish"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Notification content */}
            <div className="pl-8 pr-1">
              <h4 className="font-bold text-[13px] text-slate-900 dark:text-white leading-tight mb-0.5">
                {activeItem.title}
              </h4>
              {activeItem.body && (
                <p className="text-[12px] text-slate-600 dark:text-slate-300 leading-snug line-clamp-2">
                  {activeItem.body}
                </p>
              )}
            </div>

            {/* Bottom action hint */}
            <div className="mt-2.5 pt-2 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-[11px] font-bold text-[#D84315] pl-8">
              <span>Ko'rish uchun bosing</span>
              <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
            </div>

            {/* Animated progress bar indicator */}
            {!isHovered && (
              <motion.div
                initial={{ width: '100%' }}
                animate={{ width: '0%' }}
                transition={{ duration: 5.5, ease: 'linear' }}
                className="absolute bottom-0 left-0 h-[2.5px] bg-gradient-to-r from-[#D84315] to-amber-500"
              />
            )}
          </motion.div>
        </aside>
      )}
    </AnimatePresence>
  );
};
