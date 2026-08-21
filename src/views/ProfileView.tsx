import React, { useState, useRef, useEffect } from 'react';
import { LogIn, Loader2 } from 'lucide-react';
import { useAgroStore } from '../store/useAgroStore';
import { Post, Product } from '../data/mockAgroData';
import { ProfileHeader } from '../components/profile/ProfileHeader';
import { ProfileListingsGrid, ProfileTabType } from '../components/profile/ProfileListingsGrid';
import { EditProfileSubView } from '../components/profile/EditProfileSubView';
import { ProfileOrdersSubView } from '../components/profile/ProfileOrdersSubView';
import { ProfileSettingsSubView } from '../components/profile/ProfileSettingsSubView';

export const ProfileView: React.FC = () => {
  const {
    posts,
    products,
    savedPostIds,
    orders,
    activeSubView,
    setActiveSubView,
    setActiveTab: _setActiveTab,
    setCreateModalOpen,
    setProductDetail,
    openVideoViewer,
    showToast,
    isAdminUser,
    setEditModalItem,
    deletePost,
    currentUser,
    isAuthenticated,
    isAuthLoading,
    logoutUser,
    updateUserProfile,
    setAuthPromptOpen,
  } = useAgroStore();

  const [activeGridTab, setActiveGridTab] = useState<ProfileTabType>('posts');
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

  // Auth Guard: while the real session is still being confirmed, show a
  // neutral loading state instead of either a stale cached profile or a
  // premature "please log in" prompt — both were wrong things to show here.
  if (isAuthLoading) {
    return (
      <div className="w-full max-w-lg mx-auto py-24 flex flex-col items-center justify-center gap-3 select-none">
        <Loader2 className="w-6 h-6 text-slate-400 animate-spin" />
        <p className="text-xs text-slate-400 font-medium">Profil yuklanmoqda...</p>
      </div>
    );
  }

  // Auth Guard: Show auth prompt if not authenticated
  if (!isAuthenticated || !currentUser) {
    return (
      <div className="w-full max-w-lg mx-auto py-12 px-4 text-center space-y-6 select-none">
        <div className="w-24 h-24 mx-auto rounded-full bg-orange-50 text-[#D84315] flex items-center justify-center border-4 border-white shadow-xl">
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
            className="px-6 py-3.5 rounded-[18px] bg-[#D84315] hover:bg-[#BF360C] text-white font-black text-xs shadow-lg transition-colors flex items-center gap-2 cursor-pointer"
          >
            <LogIn className="w-4 h-4" />
            <span>Kirish / Ro'yxatdan o'tish</span>
          </button>
        </div>
      </div>
    );
  }

  // ─── Filter items strictly belonging to current authenticated user ─────────
  // Ownership must be decided by ID only. A name/handle match was used here
  // previously as a fallback, but two different sellers can share a display
  // name — that fallback would leak one user's listings into another's
  // "mine" tab.
  const ownPosts = posts.filter(
    (post) =>
      (post.userId && post.userId === currentUser.id) ||
      (post.sellerId && post.sellerId === currentUser.id)
  );

  const ownProducts = products.filter(
    (product) =>
      (product.sellerId && String(product.sellerId) === currentUser.id) ||
      (product.submittedBy && product.submittedBy === currentUser.id)
  );

  const savedPosts = posts.filter((post) => savedPostIds.includes(post.id));

  // Handle post/reel/product selection
  const handleSelectPost = (post: Post) => {
    if (post.type === 'video') {
      const allVideos = posts.filter((p) => p.type === 'video');
      const idx = allVideos.findIndex((p) => p.id === post.id);
      openVideoViewer(allVideos, Math.max(0, idx));
    } else {
      setProductDetail(post);
    }
  };

  const handleSelectProduct = (product: Product) => {
    setProductDetail(product);
  };

  const handleShareProfile = () => {
    const handle = currentUser.handle || currentUser.name;
    const url = `${window.location.origin}/#profile/${handle}`;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(url);
      showToast("Profil havolasi nusxalandi! 📋");
    } else {
      showToast(url);
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

  return (
    <div className="w-full max-w-xl mx-auto py-3 px-3.5 space-y-3.5 select-none pb-20">
      <ProfileHeader
        currentUser={currentUser}
        profileData={{
          name: currentUser.name || 'Sotuvchi',
          handle: currentUser.handle || (currentUser.email ? currentUser.email.split('@')[0] : 'user'),
          avatar: currentUser.avatar || '',
          cover: currentUser.cover || '',
          verified: true,
          location: currentUser.location || "O'zbekiston",
          bio: currentUser.bio || '',
          businessName: currentUser.businessName || '',
          role: currentUser.role || 'seller',
          website: currentUser.website || '',
          telegram: currentUser.telegram || '',
        }}
        postsCount={ownPosts.length}
        productsCount={ownProducts.length}
        savedCount={savedPosts.length}
        viewsCount={ownPosts.reduce((sum, post) => sum + (post.viewsCount || 0), 0)}
        ordersCount={orders.length}
        isProfileMenuOpen={isProfileMenuOpen}
        setProfileMenuOpen={setProfileMenuOpen}
        profileMenuRef={profileMenuRef}
        onNavigateSubView={(subView) => setActiveSubView(subView)}
        onSelectGridTab={(tab) => setActiveGridTab(tab)}
        onOpenCreateModal={() => setCreateModalOpen(true)}
        onShareProfile={handleShareProfile}
      />

      <ProfileListingsGrid
        activeGridTab={activeGridTab}
        posts={ownPosts}
        products={ownProducts}
        savedPosts={savedPosts}
        isAdminUser={isAdminUser}
        onTabChange={(tab) => setActiveGridTab(tab)}
        onSelectPost={handleSelectPost}
        onSelectProduct={handleSelectProduct}
        onEditItem={(item) => setEditModalItem(item)}
        onDeleteItem={(id) => deletePost(id)}
        onOpenCreateModal={() => setCreateModalOpen(true)}
      />
    </div>
  );
};
