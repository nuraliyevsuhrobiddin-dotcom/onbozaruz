import React, { useState, useRef, useEffect } from 'react';
import { LogIn, UserPlus } from 'lucide-react';
import { useAgroStore } from '../store/useAgroStore';
import { Post, Product } from '../data/mockAgroData';
import { ProfileHeader } from '../components/profile/ProfileHeader';
import { ProfileStats } from '../components/profile/ProfileStats';
import { ProfileQuickNav } from '../components/profile/ProfileQuickNav';
import { ProfileListingsGrid } from '../components/profile/ProfileListingsGrid';
import { EditProfileSubView } from '../components/profile/EditProfileSubView';
import { ProfileOrdersSubView } from '../components/profile/ProfileOrdersSubView';
import { ProfileSettingsSubView } from '../components/profile/ProfileSettingsSubView';
import { ProfileAdminSubView } from '../components/profile/ProfileAdminSubView';

export const ProfileView: React.FC = () => {
  const {
    posts,
    products,
    savedPostIds,
    orders,
    activeSubView,
    setActiveSubView,
    setActiveTab,
    setCreateModalOpen,
    setProductDetail,
    openVideoViewer,
    showToast,
    approveProduct,
    rejectProduct,
    addProduct,
    isAdminUser,
    setEditModalItem,
    deletePost,
    currentUser,
    isAuthenticated,
    logoutUser,
    updateUserProfile,
    setAuthPromptOpen,
  } = useAgroStore();

  const [activeGridTab, setActiveGridTab] = useState('posts');
  const [isProfileMenuOpen, setProfileMenuOpen] = useState(false);
  const profileMenuRef = useRef<HTMLDivElement>(null);

  // Close dropdown menu on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (profileMenuRef.current && !profileMenuRef.current.contains(event.target as Node)) {
        setProfileMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Auth Guard: Show auth prompt if not authenticated
  if (!isAuthenticated || !currentUser) {
    return (
      <div className="w-full max-w-lg mx-auto py-12 px-4 text-center space-y-6 select-none">
        <div className="w-24 h-24 mx-auto rounded-full bg-red-50 text-[#E53935] flex items-center justify-center border-4 border-white shadow-xl">
          <LogIn className="w-10 h-10 stroke-[2.5]" />
        </div>
        <div className="space-y-2">
          <h2 className="text-xl font-black text-[#111827]">Profilingizga kiring</h2>
          <p className="text-xs text-slate-500 font-medium max-w-sm mx-auto leading-relaxed">
            E'lon joylashtirish, saqlangan e'lonlarni ko'rish va xaridlaringizni kuzatish uchun OnBozar akkauntingizga kiring.
          </p>
        </div>
        <div className="flex items-center justify-center gap-3 pt-2">
          <button
            onClick={() => setAuthPromptOpen(true)}
            className="px-6 py-3.5 rounded-[18px] bg-[#E53935] hover:bg-[#C62828] text-white font-black text-xs shadow-lg transition-colors flex items-center gap-2"
          >
            <LogIn className="w-4 h-4" />
            <span>Kirish / Ro'yxatdan o'tish</span>
          </button>
        </div>
      </div>
    );
  }

  // Filter posts belonging to current logged in user
  const ownPosts = posts.filter(
    (post) => post.sellerId === currentUser.id || post.userId === currentUser.id
  );
  const savedPosts = posts.filter((post) => savedPostIds.includes(post.id));
  const gridItems = activeGridTab === 'posts' ? ownPosts : savedPosts;

  const viewsCountRaw = ownPosts.reduce((sum, p) => sum + (p.viewsCount || 0), 0);
  const formatCompact = (val: number) => {
    if (val >= 1000000) return `${(val / 1000000).toFixed(1)}M`;
    if (val >= 1000) return `${(val / 1000).toFixed(1)}K`;
    return String(val);
  };

  const pendingProducts = products.filter((p) => p.approvalStatus === 'pending');
  const approvedProducts = products.filter((p) => p.approvalStatus === 'approved');

  // Handle item selection (Post or Product detail)
  const handleSelectDetail = (item: Post | Product) => {
    if ('mediaUrl' in item || 'type' in item) {
      const postItem = item as Post;
      const index = posts.findIndex((p) => p.id === postItem.id);
      openVideoViewer(posts, index >= 0 ? index : 0);
    } else {
      setProductDetail(item as Product);
    }
  };

  // Render active SubView
  if (activeSubView === 'edit-profile') {
    return (
      <EditProfileSubView
        currentUser={currentUser}
        onBack={() => setActiveSubView(null)}
        updateUserProfile={updateUserProfile}
        showToast={showToast}
      />
    );
  }

  if (activeSubView === 'orders') {
    return (
      <ProfileOrdersSubView
        orders={orders}
        onBack={() => setActiveSubView(null)}
        showToast={showToast}
      />
    );
  }

  if (activeSubView === 'settings') {
    return (
      <ProfileSettingsSubView
        onBack={() => setActiveSubView(null)}
        showToast={showToast}
        onLogout={logoutUser}
      />

    );
  }

  if (activeSubView === 'admin-panel' && isAdminUser) {
    return (
      <ProfileAdminSubView
        onBack={() => setActiveSubView(null)}
        pendingProducts={pendingProducts}
        approvedProducts={approvedProducts}
        ordersCount={orders.length}
        onApproveProduct={approveProduct}
        onRejectProduct={rejectProduct}
        onAddAdminProduct={addProduct}
        showToast={showToast}
      />
    );
  }

  // Main Profile View Dashboard
  return (
    <div className="w-full max-w-xl mx-auto py-3 px-3.5 space-y-3.5 select-none pb-20">
      <ProfileHeader
        currentUser={currentUser}
        profileData={{
          name: currentUser.name || 'Fermer',
          handle: currentUser.handle || currentUser.email.split('@')[0],
          avatar: currentUser.avatar || '',
          cover: currentUser.cover || '',
          verified: true,
          location: currentUser.location || "O'zbekiston",
          bio: currentUser.bio || (currentUser.businessName ? `${currentUser.businessName} rasmiy agro sahifasi` : ''),
        }}
        isAdminUser={isAdminUser}
        ordersCount={orders.length}
        isProfileMenuOpen={isProfileMenuOpen}
        setProfileMenuOpen={setProfileMenuOpen}
        profileMenuRef={profileMenuRef}
        onNavigateSubView={(subView) => setActiveSubView(subView)}
        onOpenCreateModal={() => setCreateModalOpen(true)}
        onLogout={logoutUser}
      />

      <ProfileStats
        postsCount={ownPosts.length}
        viewsCount={formatCompact(viewsCountRaw)}
        followersCount={formatCompact(0)}
        followingCount={formatCompact(0)}
        onTabChange={(tab) => setActiveGridTab(tab)}
        showToast={showToast}
      />

      <ProfileQuickNav
        ordersCount={orders.length}
        isAdminUser={isAdminUser}
        onNavigateSubView={(subView) => {
          if (subView === 'admin-panel') {
            // Navigate to full admin tab instead of subview
            setActiveTab('admin');
          } else {
            setActiveSubView(subView);
          }
        }}
      />

      <ProfileListingsGrid
        activeGridTab={activeGridTab}
        gridItems={gridItems}
        isAdminUser={isAdminUser}
        onTabChange={(tab) => setActiveGridTab(tab)}
        onSelectDetail={handleSelectDetail}
        onEditItem={(item) => setEditModalItem(item)}
        onDeleteItem={(id) => deletePost(id)}
        onOpenCreateModal={() => setCreateModalOpen(true)}
      />
    </div>
  );
};
