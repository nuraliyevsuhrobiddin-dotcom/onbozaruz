import { useCallback, useEffect } from 'react';
import { motion, AnimatePresence, type Transition } from 'framer-motion';
import { useAgroStore } from './store/useAgroStore';

import { InstagramHeader } from './components/InstagramHeader';
import { InstagramBottomNav } from './components/InstagramBottomNav';
import { DesktopLeftSidebar } from './components/DesktopLeftSidebar';
import { DesktopRightSidebar } from './components/DesktopRightSidebar';

import { HomeFeedView } from './views/HomeFeedView';
import { SearchExploreView } from './views/SearchExploreView';
import { B2BView } from './views/B2BView';
import { ProfileView } from './views/ProfileView';
import { useAppNavigation, replaceAppRoute } from './hooks/useAppNavigation';
import { useOverlayNavigation } from './hooks/useOverlayNavigation';

import { CreatePostModal } from './components/CreatePostModal';
import { CommentSheetModal } from './components/CommentSheetModal';
import { ShareModal } from './components/ShareModal';
import { ProductDetailModal } from './components/ProductDetailModal';
import { NotificationsDrawerModal } from './components/NotificationsDrawerModal';
import { PushNotificationBanner } from './components/ui/PushNotificationBanner';
import { Toast } from './components/ui/Toast';
import { VideoReelsViewer } from './components/VideoReelsViewer';
import { CategoryExplorerModal } from './components/CategoryExplorerModal';
import { EditListingModal } from './components/EditListingModal';
import { AuthView } from './views/AuthView';
import { AuthCallbackView } from './views/AuthCallbackView';
import { AdminView } from './views/AdminView';
import { SellerProfileModal } from './components/SellerProfileModal';
import { subscribeToAuthState } from './api/authClient';
import { InstallAppPrompt } from './components/InstallAppPrompt';
import { PrivacyPolicyView } from './views/PrivacyPolicyView';
import { postsRepository } from './api/repositories/postsRepository';
import { useViewerLocation } from './store/useViewerLocation';



const pageVariants = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -8 },
};

const pageTransition: Transition = {
  duration: 0.2,
  ease: 'easeInOut',
};

export default function App() {
  const {
    activeTab,
    toastMessage,
    hideToast,
    selectedCategoryModalId,
    setSelectedCategoryModalId,
    hydrateFromApi,
    retryHydrate,
    isAuthenticated,
    isAuthPromptOpen,
    loginUser,
    restoreSession,
    clearSession,
    setAuthPromptOpen,
    b2bRoute,
  } = useAgroStore();
  const isMarketMap = activeTab === 'market' && b2bRoute.view === 'map';
  const showHeader = activeTab !== 'search' && activeTab !== 'admin' && !isMarketMap;

  const { isAuthCallback, isPrivacyPolicy } = useAppNavigation();
  const dismissAuth = useOverlayNavigation(isAuthPromptOpen && !isAuthenticated, () => setAuthPromptOpen(false));
  const handleAuthSuccess = useCallback(async (user: Parameters<typeof loginUser>[0], isNewUser = false) => {
    await loginUser(user);
    if (useAgroStore.getState().currentUser?.id !== user.id) return;
    setAuthPromptOpen(false);
    const isAdmin = useAgroStore.getState().isAdminUser;
    replaceAppRoute(isAdmin ? '/#admin' : isNewUser ? '/#profile/edit-profile' : '/#profile');
  }, [loginUser, setAuthPromptOpen]);
  const sharedPostId = new URLSearchParams(window.location.search).get('post');

  useEffect(() => {
    if (!sharedPostId || isAuthCallback || isPrivacyPolicy) return;
    let cancelled = false;
    void postsRepository.get(sharedPostId).then(post => {
      if (cancelled) return;
      const store = useAgroStore.getState();
      if (!post || (post.status && post.status !== 'approved') || (post.expiresAt && Date.parse(post.expiresAt) <= Date.now())) {
        store.showToast("E'lon topilmadi yoki muddati tugagan");
        return;
      }
      if (post.type === 'video') store.openVideoViewer([post], 0);
      else store.setProductDetail(post);
    }).catch(() => {
      if (!cancelled) useAgroStore.getState().showToast("E'lonni ochib bo‘lmadi. Havola yoki internet aloqasini tekshiring.");
    });
    return () => { cancelled = true; };
  }, [sharedPostId, isAuthCallback, isPrivacyPolicy]);

  // All hooks MUST run before any early return (Rules of Hooks)
  useEffect(() => {
    hydrateFromApi();
    return useViewerLocation.subscribe((state, previous) => {
      if (state.point?.latitude !== previous.point?.latitude || state.point?.longitude !== previous.point?.longitude) void hydrateFromApi();
    });
  }, [hydrateFromApi]);

  // Online/Offline holat kuzatuvchisi
  useEffect(() => {
    const handleOnline = () => {
      useAgroStore.setState({ isOffline: false });
      retryHydrate(); // Internet qaytganda avtomatik yangilash
    };
    const handleOffline = () => {
      useAgroStore.setState({ isOffline: true });
    };
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [retryHydrate]);

  useEffect(() => {
    if (!isAuthCallback) {
      void restoreSession();
    }

    return subscribeToAuthState((event, session) => {
      if (event === 'SIGNED_OUT') {
        clearSession();
        return;
      }
      if (!session) return;
      void restoreSession();
    });
  }, [clearSession, isAuthCallback, restoreSession]);

  // ─── Single Page App History & Phone Back Button Handler ─────────────────
  if (isPrivacyPolicy) {
    return (
      <PrivacyPolicyView
        onBack={() => {
          if (history.state?.__onbozarFrom) history.back();
          else replaceAppRoute('/#home');
        }}
      />
    );
  }

  if (isAuthCallback) {
    return (
      <AuthCallbackView
        onSuccess={handleAuthSuccess}
      />
    );
  }

  // Feed and search remain public. Registration is requested only for Market
  // and for creating a listing.
  if (isAuthPromptOpen && !isAuthenticated) {
    return (
      <AuthView
        onSuccess={handleAuthSuccess}
        onBack={dismissAuth}
      />
    );
  }

  return (
    <div
      className="min-h-screen bg-[#F8F9FA] text-[#111111] antialiased flex flex-col"
      style={{ fontFamily: "'Inter', system-ui, -apple-system, sans-serif" }}
    >
      {/* в”Ђв”Ђ Fixed Desktop Left Sidebar (260px) в”Ђв”Ђ */}
      <DesktopLeftSidebar />

      {/* в”Ђв”Ђ Mobile Header (Hidden on Desktop) в”Ђв”Ђ */}
      <div className="lg:hidden">
        <AnimatePresence mode="wait">
          {showHeader && (
            <motion.div
              key="mobile-header"
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.2 }}
            >
              <InstagramHeader />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ─── Main Layout Area (Shifted right by sidebar width 80px) ─── */}
      <div className="flex-1 w-full lg:pl-20 flex justify-center">
        <div className={`w-full flex justify-center gap-5 ${isMarketMap ? 'px-0 py-0 max-w-none' : 'px-0 sm:px-4 py-1.5 sm:py-3 lg:py-5'} ${activeTab === 'admin' || isMarketMap ? 'max-w-none' : 'max-w-275'}`}>
          {/* Main Feed / Content View */}
          <main className={`flex-1 min-w-0 px-0 sm:px-0 ${isMarketMap ? 'pb-0 lg:pb-0 max-w-none' : 'mobile-content-bottom lg:pb-10'} ${activeTab === 'admin' || isMarketMap ? 'max-w-none' : 'max-w-150'}`}>
            <AnimatePresence mode="wait">
              {activeTab === 'home' && (
                <motion.div
                  key="home"
                  variants={pageVariants}
                  initial="initial"
                  animate="animate"
                  exit="exit"
                  transition={pageTransition}
                >
                  <HomeFeedView />
                </motion.div>
              )}

              {activeTab === 'search' && (
                <motion.div
                  key="search"
                  variants={pageVariants}
                  initial="initial"
                  animate="animate"
                  exit="exit"
                  transition={pageTransition}
                >
                  <SearchExploreView />
                </motion.div>
              )}

              {activeTab === 'market' && (
                <motion.div
                  key="market"
                  variants={pageVariants}
                  initial="initial"
                  animate="animate"
                  exit="exit"
                  transition={pageTransition}
                >
                  <B2BView />
                </motion.div>
              )}

              {activeTab === 'profile' && (
                <motion.div
                  key="profile"
                  variants={pageVariants}
                  initial="initial"
                  animate="animate"
                  exit="exit"
                  transition={pageTransition}
                >
                  <ProfileView />
                </motion.div>
              )}

              {activeTab === 'admin' && (
                <motion.div
                  key="admin"
                  variants={pageVariants}
                  initial="initial"
                  animate="animate"
                  exit="exit"
                  transition={pageTransition}
                >
                  <AdminView />
                </motion.div>
              )}
            </AnimatePresence>
          </main>

          {/* в”Ђв”Ђ Desktop Right Sticky Sidebar (Hidden on Mobile) в”Ђв”Ђ */}
          {activeTab === 'home' && <DesktopRightSidebar />}
        </div>
      </div>

      {/* в”Ђв”Ђ Mobile Bottom Navigation (Hidden on Desktop) в”Ђв”Ђ */}
      <div className="lg:hidden">
        <InstagramBottomNav />
      </div>

      {/* Global Modals & Drawers */}
      <CreatePostModal />
      <EditListingModal />
      <CommentSheetModal />
      <ShareModal />
      <SellerProfileModal />
      <ProductDetailModal />

      <NotificationsDrawerModal />

      {/* SMS / Top Dropdown Push Notification Banner */}
      <PushNotificationBanner />

      {/* Global Toast Micro-Interaction */}
      <Toast message={toastMessage} onClose={hideToast} />

      {/* Fullscreen Video Reels Viewer */}
      <VideoReelsViewer />

      <InstallAppPrompt />

      {/* Category Explorer Modal */}
      <CategoryExplorerModal
        categoryId={selectedCategoryModalId}
        onClose={() => setSelectedCategoryModalId(null)}
      />
    </div>
  );
}
