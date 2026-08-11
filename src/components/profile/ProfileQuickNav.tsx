import React from 'react';
import { Edit3, Package, ShieldCheck, ChevronRight } from 'lucide-react';

interface ProfileQuickNavProps {
  ordersCount: number;
  isAdminUser: boolean;
  onNavigateSubView: (subView: 'edit-profile' | 'orders' | 'admin-panel' | 'settings') => void;
}

export const ProfileQuickNav: React.FC<ProfileQuickNavProps> = ({
  ordersCount,
  isAdminUser,
  onNavigateSubView,
}) => {
  return (
    <div className="grid grid-cols-2 gap-2">
      <button
        onClick={() => onNavigateSubView('edit-profile')}
        className="p-3.5 bg-white rounded-[22px] border border-slate-200/80 shadow-sm flex items-center justify-between hover:border-slate-300 transition-all text-left group"
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-9 h-9 rounded-[14px] bg-red-50 text-[#E53935] flex items-center justify-center shrink-0">
            <Edit3 className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <span className="text-xs font-black text-[#111827] block truncate">Profilni tahrirlash</span>
            <span className="text-[10px] text-slate-400 font-bold block truncate">Ma'lumotlar, rasm</span>
          </div>
        </div>
        <ChevronRight className="w-4 h-4 text-slate-400 group-hover:translate-x-0.5 transition-transform shrink-0" />
      </button>

      <button
        onClick={() => onNavigateSubView('orders')}
        className="p-3.5 bg-white rounded-[22px] border border-slate-200/80 shadow-sm flex items-center justify-between hover:border-slate-300 transition-all text-left group"
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-9 h-9 rounded-[14px] bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
            <Package className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <span className="text-xs font-black text-[#111827] block truncate">Buyurtmalarim</span>
            <span className="text-[10px] text-slate-400 font-bold block truncate">{ordersCount} ta xarid</span>
          </div>
        </div>
        <ChevronRight className="w-4 h-4 text-slate-400 group-hover:translate-x-0.5 transition-transform shrink-0" />
      </button>

      {isAdminUser && (
        <button
          onClick={() => onNavigateSubView('admin-panel')}
          className="col-span-2 p-3.5 bg-gradient-to-r from-red-500 to-rose-600 rounded-[22px] text-white shadow-md flex items-center justify-between hover:brightness-105 transition-all text-left group"
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-[14px] bg-white/20 backdrop-blur-md text-white flex items-center justify-center shrink-0">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <span className="text-xs font-black text-white block truncate">Boshqaruv paneli (Admin)</span>
              <span className="text-[10px] text-white/80 font-bold block truncate">
                Savdo statistikasi, e'lonlarni tasdiqlash va boshqarish
              </span>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-white group-hover:translate-x-0.5 transition-transform shrink-0" />
        </button>
      )}
    </div>
  );
};
