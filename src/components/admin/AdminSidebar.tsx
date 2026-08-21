import React from 'react';
import {
  LayoutDashboard, Users, Megaphone, Factory, Package, ShoppingCart, Percent,
  Tag, Image, Flag, FileText, X,
} from 'lucide-react';

type AdminTab =
  | 'dashboard' | 'users' | 'posts' | 'b2b_suppliers' | 'b2b_products'
  | 'b2b_orders' | 'b2b_commission' | 'categories' | 'media' | 'reports' | 'audit';

interface AdminSidebarProps {
  activeTab: AdminTab;
  onTabChange: (tab: AdminTab) => void;
  onClose: () => void;
  pendingCount: number;
}

const NAV_ITEMS: { id: AdminTab; label: string; icon: React.ElementType; badge?: boolean }[] = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'users', label: 'Foydalanuvchilar', icon: Users },
  { id: 'posts', label: "E'lonlar", icon: Megaphone, badge: true },
  { id: 'b2b_suppliers', label: 'B2B Supplierlar', icon: Factory },
  { id: 'b2b_products', label: 'B2B Mahsulotlar', icon: Package },
  { id: 'b2b_orders', label: 'B2B Buyurtmalar', icon: ShoppingCart },
  { id: 'b2b_commission', label: 'Komissiya', icon: Percent },
  { id: 'categories', label: 'Kategoriyalar', icon: Tag },
  { id: 'media', label: 'Media', icon: Image },
  { id: 'reports', label: 'Shikoyatlar', icon: Flag },
  { id: 'audit', label: 'Audit Log', icon: FileText },
];

export const AdminSidebar: React.FC<AdminSidebarProps> = ({
  activeTab, onTabChange, onClose, pendingCount,
}) => {
  return (
    <aside className="flex flex-col h-full bg-[#111827] text-white w-56 shrink-0 select-none">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-4 border-b border-white/10">
        <div>
          <span className="font-black text-sm text-white tracking-tight">OnBozar</span>
          <span className="ml-1 px-1.5 py-0.5 rounded-md bg-[#D84315] text-white text-[9px] font-black uppercase">
            Admin
          </span>
        </div>
        <button
          onClick={onClose}
          className="p-1 rounded-full hover:bg-white/10 text-white/60 transition-colors lg:hidden"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Nav Items */}
      <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-0.5">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onTabChange(item.id)}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-[14px] text-left transition-all text-xs font-bold group ${
                isActive
                  ? 'bg-[#D84315] text-white shadow-lg'
                  : 'text-white/60 hover:text-white hover:bg-white/8'
              }`}
            >
              <span className="flex items-center gap-2.5">
                <Icon className="w-4 h-4 shrink-0" />
                {item.label}
              </span>
              {item.badge && pendingCount > 0 && (
                <span className={`px-1.5 py-0.5 rounded-full text-[9px] font-black ${
                  isActive ? 'bg-white/30 text-white' : 'bg-[#D84315] text-white'
                }`}>
                  {pendingCount}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="px-4 py-3 border-t border-white/10">
        <p className="text-[10px] text-white/30 font-medium">OnBozar v1.0 · Admin Panel</p>
      </div>
    </aside>
  );
};
