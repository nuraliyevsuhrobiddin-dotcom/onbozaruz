import React, { useCallback, useState } from 'react';
import { ShieldOff, Home, Menu, X } from 'lucide-react';
import { useAgroStore } from '../store/useAgroStore';
import { adminRepository } from '../api/adminRepository';
import { AdminSidebar } from '../components/admin/AdminSidebar';
import { AdminDashboardTab } from '../components/admin/AdminDashboardTab';
import { AdminUsersTab } from '../components/admin/AdminUsersTab';
import { AdminPostsTab } from '../components/admin/AdminPostsTab';
import { AdminProductsTab } from '../components/admin/AdminProductsTab';
import { AdminOrdersTab } from '../components/admin/AdminOrdersTab';
import { AdminCategoriesTab } from '../components/admin/AdminCategoriesTab';
import { AdminMediaTab } from '../components/admin/AdminMediaTab';
import { AdminReportsTab } from '../components/admin/AdminReportsTab';
import { AdminAuditLogsTab } from '../components/admin/AdminAuditLogsTab';

type AdminTab =
  | 'dashboard' | 'users' | 'posts' | 'products'
  | 'orders' | 'categories' | 'media' | 'reports' | 'audit';

export const AdminView: React.FC = () => {
  const {
    isAdminUser,
    currentUser,
    posts,
    products,
    orders,
    setActiveTab,
    showToast,
    approveProduct,
    rejectProduct,
    deleteProduct,
    deletePost,
    setEditModalItem,
    setCreateModalOpen,
    approvePost,
    rejectPost,
  } = useAgroStore();

  const [activeTab, setTab] = useState<AdminTab>('dashboard');
  const [isSidebarOpen, setSidebarOpen] = useState(false);

  // ─── Security Guard: UI layer ───────────────────────────────────────────
  // Real protection is enforced at DB level via Supabase RLS policies.
  // This UI guard prevents rendering sensitive admin components for non-admins.
  if (!isAdminUser || !currentUser) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] px-6 text-center space-y-5 select-none">
        <div className="w-20 h-20 rounded-full bg-red-50 border-4 border-white shadow-xl flex items-center justify-center">
          <ShieldOff className="w-10 h-10 text-[#E53935]" />
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

  // ─── Audit logging helper ──────────────────────────────────────────────
  const logAction = useCallback(
    async (action: string, targetId: string, oldVal: any, newVal: any) => {
      await adminRepository.logAdminAction(
        currentUser.email,
        action,
        action.split('_').slice(-1)[0] ?? 'unknown',
        targetId,
        oldVal,
        newVal,
      );
    },
    [currentUser.email],
  );

  // ─── Order status update handler ──────────────────────────────────────
  const handleOrderStatusUpdate = (orderId: string, status: string, step: number) => {
    // Update orders in store — Supabase update done in AdminOrdersTab
    showToast(`Buyurtma holati: ${status}`);
  };

  // ─── Tab Renderer ──────────────────────────────────────────────────────
  const renderTab = () => {
    switch (activeTab) {
      case 'dashboard':
        return <AdminDashboardTab adminEmail={currentUser.email} />;
      case 'users':
        return (
          <AdminUsersTab
            adminEmail={currentUser.email}
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
      case 'products':
        return (
          <AdminProductsTab
            products={products}
            onApprove={(id) => approveProduct(id)}
            onReject={(id) => rejectProduct(id)}
            onDelete={(id) => deleteProduct(id)}
            onEdit={(item) => setEditModalItem(item)}
            onAdd={() => setCreateModalOpen(true)}
            onLogAction={logAction}
            showToast={showToast}
          />
        );
      case 'orders':
        return (
          <AdminOrdersTab
            orders={orders}
            onUpdateStatus={handleOrderStatusUpdate}
            onLogAction={logAction}
            showToast={showToast}
          />
        );
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
          <span className="ml-auto px-2 py-0.5 rounded-full bg-[#E53935] text-white text-[9px] font-black">
            {currentUser.email}
          </span>
        </div>

        {/* Desktop topbar */}
        <div className="hidden lg:flex items-center justify-between px-6 py-3 bg-white border-b border-slate-200">
          <span className="font-black text-sm text-slate-400 capitalize">{activeTab}</span>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-500">{currentUser.email}</span>
            {pendingCount > 0 && (
              <span className="px-2 py-0.5 rounded-full bg-[#E53935] text-white text-[10px] font-black">
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
