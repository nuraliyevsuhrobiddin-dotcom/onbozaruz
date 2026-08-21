import React, { useCallback, useState } from 'react';
import { ShieldOff, Home, Menu } from 'lucide-react';
import { useAgroStore } from '../store/useAgroStore';
import { adminRepository } from '../api/adminRepository';
import { AdminSidebar } from '../components/admin/AdminSidebar';
import { AdminDashboardTab } from '../components/admin/AdminDashboardTab';
import { AdminUsersTab } from '../components/admin/AdminUsersTab';
import { AdminPostsTab } from '../components/admin/AdminPostsTab';
import { AdminB2BSuppliersTab } from '../components/admin/AdminB2BSuppliersTab';
import { AdminB2BProductsTab } from '../components/admin/AdminB2BProductsTab';
import { AdminB2BOrdersTab } from '../components/admin/AdminB2BOrdersTab';
import { AdminB2BCommissionTab } from '../components/admin/AdminB2BCommissionTab';
import { AdminCategoriesTab } from '../components/admin/AdminCategoriesTab';
import { AdminMediaTab } from '../components/admin/AdminMediaTab';
import { AdminReportsTab } from '../components/admin/AdminReportsTab';
import { AdminAuditLogsTab } from '../components/admin/AdminAuditLogsTab';

type AdminTab =
  | 'dashboard' | 'users' | 'posts' | 'b2b_suppliers' | 'b2b_products'
  | 'b2b_orders' | 'b2b_commission' | 'categories' | 'media' | 'reports' | 'audit';

export const AdminView: React.FC = () => {
  const {
    isAdminUser,
    currentUser,
    posts,
    products,
    setActiveTab,
    showToast,
    deletePost,
    approvePost,
    rejectPost,
  } = useAgroStore();

  const [activeTab, setTab] = useState<AdminTab>('dashboard');
  const [isSidebarOpen, setSidebarOpen] = useState(false);

  const logAction = useCallback(
    async (action: string, targetId: string, oldVal: any, newVal: any) => {
      if (!currentUser) return;
      await adminRepository.logAdminAction(currentUser.email, action, action.split('_').slice(-1)[0] ?? 'unknown', targetId, oldVal, newVal);
    },
    [currentUser],
  );

  // ─── Security Guard: UI layer ───────────────────────────────────────────
  // Real protection is enforced at DB level via Supabase RLS policies.
  // This UI guard prevents rendering sensitive admin components for non-admins.
  if (!isAdminUser || !currentUser) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] px-6 text-center space-y-5 select-none">
        <div className="w-20 h-20 rounded-full bg-red-50 border-4 border-white shadow-xl flex items-center justify-center">
          <ShieldOff className="w-10 h-10 text-[#D84315]" />
        </div>
        <div className="space-y-2">
          <h2 className="font-black text-xl text-[#111827]">Ruxsat berilmagan</h2>
          <p className="text-xs text-slate-500 font-medium max-w-xs mx-auto leading-relaxed">
            Admin panelga faqat tasdiqlangan administratorlar kira oladi. Ushbu harakat qayd etildi.
          </p>
        </div>
        <button
          onClick={() => setActiveTab('home')}
          className="px-6 py-3 rounded-[18px] bg-[#111827] text-white font-black text-xs flex items-center gap-2 hover:bg-black transition-colors"
        >
          <Home className="w-4 h-4" />
          Bosh sahifaga qaytish
        </button>
      </div>
    );
  }

  const pendingCount = posts.filter((p) => (p as any).status === 'pending').length
    + products.filter((p) => p.approvalStatus === 'pending').length;

  // ─── Tab Renderer ──────────────────────────────────────────────────────
  const renderTab = () => {
    switch (activeTab) {
      case 'dashboard':
        return <AdminDashboardTab adminEmail={currentUser.email} />;
      case 'users':
        return (
          <AdminUsersTab
            onLogAction={logAction}
            showToast={showToast}
          />
        );
      case 'posts':
        return (
          <AdminPostsTab
            posts={posts}
            onApprove={(id) => { approvePost?.(id); }}
            onReject={(id) => { rejectPost?.(id); }}
            onDelete={(id) => deletePost(id)}
            onLogAction={logAction}
            showToast={showToast}
          />
        );
      case 'b2b_suppliers':
        return <AdminB2BSuppliersTab onLogAction={logAction} showToast={showToast} />;
      case 'b2b_products':
        return <AdminB2BProductsTab onLogAction={logAction} showToast={showToast} />;
      case 'b2b_orders':
        return <AdminB2BOrdersTab showToast={showToast} />;
      case 'b2b_commission':
        return <AdminB2BCommissionTab />;
      case 'categories':
        return (
          <AdminCategoriesTab
            onLogAction={logAction}
            showToast={showToast}
          />
        );
      case 'media':
        return (
          <AdminMediaTab
            posts={posts}
            products={products}
            showToast={showToast}
          />
        );
      case 'reports':
        return (
          <AdminReportsTab
            onLogAction={logAction}
            showToast={showToast}
          />
        );
      case 'audit':
        return <AdminAuditLogsTab />;
      default:
        return null;
    }
  };

  return (
    <div className="flex h-full min-h-screen bg-slate-50 select-none">
      {/* Mobile overlay */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div className={`fixed lg:static inset-y-0 left-0 z-40 transition-transform duration-300 lg:translate-x-0 ${
        isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
      }`}>
        <AdminSidebar
          activeTab={activeTab}
          onTabChange={(tab) => {
            setTab(tab);
            setSidebarOpen(false);
          }}
          onClose={() => setSidebarOpen(false)}
          pendingCount={pendingCount}
        />
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Topbar for mobile */}
        <div className="flex items-center gap-3 px-4 py-3 bg-white border-b border-slate-200 lg:hidden">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-2 rounded-[12px] bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
          >
            <Menu className="w-5 h-5" />
          </button>
          <span className="font-black text-sm text-[#111827]">OnBozar Admin</span>
          <span className="ml-auto px-2 py-0.5 rounded-full bg-[#D84315] text-white text-[9px] font-black">
            {currentUser.email}
          </span>
        </div>

        {/* Desktop topbar */}
        <div className="hidden lg:flex items-center justify-between px-6 py-3 bg-white border-b border-slate-200">
          <span className="font-black text-sm text-slate-400 capitalize">{activeTab}</span>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-500">{currentUser.email}</span>
            {pendingCount > 0 && (
              <span className="px-2 py-0.5 rounded-full bg-[#D84315] text-white text-[10px] font-black">
                {pendingCount} pending
              </span>
            )}
          </div>
        </div>

        {/* Tab Content */}
        <main className="flex-1 overflow-y-auto p-4 lg:p-6 pb-20 max-w-4xl mx-auto w-full">
          {renderTab()}
        </main>
      </div>
    </div>
  );
};
